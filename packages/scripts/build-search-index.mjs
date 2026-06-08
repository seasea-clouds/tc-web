#!/usr/bin/env node
/**
 * build-search-index.mjs — 生成统一搜索索引
 *
 * 读取 apps/site/messages/*.json + apps/site/content/blog/{locale}/*.mdx
 * 输出 {services, blog, faq, generated} 格式的 search-index-{locale}.json
 *
 * 用法: node packages/scripts/build-search-index.mjs [--out-dir=<path>]
 *   默认输出到 apps/site/public/
 *   也可指定 --out-dir=apps/blog/public 或 apps/portal/public
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const APPS_DIR = path.join(ROOT, 'apps');

/** Auto-discover apps that have messages/ directory */
function discoverApps() {
  return fs.readdirSync(APPS_DIR).filter(name => {
    const dir = path.join(APPS_DIR, name);
    return fs.existsSync(path.join(dir, 'messages'));
  }).sort();
}

// 服务列表 — keys 匹配 Navbar servicesDropdown + translation namespaces
const services = [
  { slug: 'gacc', ns: 'ServiceGacc', descNs: 'ServiceGacc' },
  { slug: 'label', ns: 'ServiceLabel', descNs: 'ServiceLabel' },
  { slug: 'ccc', ns: 'ServiceCcc', descNs: 'ServiceCcc' },
  { slug: 'cosmetics', ns: 'ServiceCosmetics', descNs: 'ServiceCosmetics' },
  { slug: 'ecommerce', ns: 'ServiceEcommerce', descNs: 'ServiceEcommerce' },
  { slug: 'brand', ns: 'ServiceBrand', descNs: 'ServiceBrand' },
];

function getLocaleFiles(messagesDir) {
  return fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));
}

function loadMessages(messagesDir, locale) {
  const file = path.join(messagesDir, locale);
  const fullPath = fs.existsSync(`${file}.json`) ? `${file}.json` : file;
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

function extractServices(msg) {
  return services.map(s => {
    const ns = msg[s.ns] || {};
    const title = ns.heroTitle || ns.title || s.slug;
    let desc = ns.heroSubtitle || ns.description || '';
    if (desc.length > 200) desc = desc.slice(0, 200) + '…';
    return {
      type: 'service',
      title,
      desc,
      href: `/services/${s.slug}/`,
      searchable: `${title} ${desc} ${s.slug}`.toLowerCase(),
    };
  });
}

function extractBlog(blogDir, locale, msg) {
  const localeBlogDir = path.join(blogDir, locale);
  if (!fs.existsSync(localeBlogDir)) return [];

  const blogT = msg.Blog || {};
  const posts = [];

  for (const file of fs.readdirSync(localeBlogDir).filter(f => f.endsWith('.mdx'))) {
    const content = fs.readFileSync(path.join(localeBlogDir, file), 'utf-8');
    const { data } = matter(content);
    const slug = data.slug || file.replace('.mdx', '');
    const title = data.title || '';
    const excerpt = data.excerpt || '';
    const category = data.category || '';
    const categoryKey = blogT[category] || category;

    if (!title) continue;

    posts.push({
      type: 'blog',
      title,
      desc: excerpt.slice(0, 200),
      href: `/blog/${slug}/`,
      category: categoryKey,
      searchable: `${title} ${excerpt} ${category}`.toLowerCase(),
    });
  }
  return posts;
}

function extractCheckPages(msg) {
  const check = msg.Check || {};
  const seen = new Set();
  const items = [];
  for (const [key, val] of Object.entries(check)) {
    const slug = key.replace(/(Title|Desc)$/, '').toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      type: 'check',
      title: check[slug + 'Title'] || slug,
      desc: check[slug + 'Desc'] || '',
      href: '/c/check/' + slug + '/',
    });
  }
  return items;
}

function extractFAQ(msg) {
  const faq = msg.Faq || {};
  const items = [];
  const categories = ['general', 'gacc', 'label', 'ccc', 'cosmetics', 'ecommerce', 'brand'];

  for (const cat of categories) {
    const title = faq[`${cat}Title`] || '';
    for (let i = 1; i <= 20; i++) {
      const q = faq[`${cat}Q${i}`];
      const a = faq[`${cat}A${i}`];
      if (q && a) {
        items.push({
          type: 'faq',
          title: q,
          desc: a.slice(0, 200),
          href: '/faq/',
          category: title,
          searchable: `${q} ${a} ${title}`.toLowerCase(),
        });
      }
      const qa = faq[`${cat}Q${i}a`];
      const aa = faq[`${cat}A${i}a`];
      if (qa && aa) {
        items.push({
          type: 'faq',
          title: qa,
          desc: aa.slice(0, 200),
          href: '/faq/',
          category: title,
          searchable: `${qa} ${aa} ${title}`.toLowerCase(),
        });
      }
    }
  }
  return items;
}

function generateIndex(messagesDir, blogDir, locale) {
  const msg = loadMessages(messagesDir, locale);
  // Load portal messages to extract check page titles
  const portalMsgDir = path.join(APPS_DIR, 'portal', 'messages');
  if (fs.existsSync(portalMsgDir)) {
    const portalMsg = loadMessages(portalMsgDir, locale);
    Object.assign(msg, portalMsg);
  }
  return {
    services: extractServices(msg),
    blog: extractBlog(blogDir, locale, msg),
    faq: extractFAQ(msg),
    checks: extractCheckPages(msg),
    generated: new Date().toISOString(),
  };
}

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

export function buildSearchIndexes(messagesDir, blogDir, outDir) {
  const locales = getLocaleFiles(messagesDir).map(f => f.replace('.json', ''));
  console.log(`Generating search index for ${locales.length} locales...`);

  for (const locale of locales) {
    try {
      const index = generateIndex(messagesDir, blogDir, locale);
      const outFile = path.join(outDir, `search-index-${locale}.json`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(index), 'utf-8');
      const total = index.services.length + index.blog.length + index.faq.length + index.checks.length;
      console.log('  ' + locale + ': ' + total + ' items (' + index.services.length + 'S + ' + index.blog.length + 'B + ' + index.faq.length + 'F + ' + index.checks.length + 'C)');
    } catch (err) {
      console.error('  ' + locale + ': FAILED - ' + err.message);
    }
  }

  console.log('Done.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { 'out-dir': outDirArg } = parseArgs();

  // Read blog content from blog app, not site
  const messagesDir = path.join(ROOT, 'apps', 'site', 'messages');
  const blogDir = path.join(ROOT, 'apps', 'blog', 'content');

  // Default outDir: apps/site/public/
  const defaultOutDir = path.join(ROOT, 'apps', 'site', 'public');
  const outDir = outDirArg ? path.resolve(ROOT, outDirArg) : defaultOutDir;

  console.log('Apps discovered:', discoverApps().join(', '));
  buildSearchIndexes(messagesDir, blogDir, outDir);
}
