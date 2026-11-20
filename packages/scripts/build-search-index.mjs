#!/usr/bin/env node
/**
 * build-search-index.mjs — 生成统一搜索索引
 *
 * 读取 site + portal + insights + regulations 各 app 的 messages 和 content
 * 输出 {services, insights, faq, regulations, checks, generated} 格式的 search-index-{locale}.json
 *
 * 用法: node packages/scripts/build-search-index.mjs [--out-dir=<path>]
 *   默认输出到当前工作目录的 public/ (支持所有项目)
 *   也可指定 --out-dir=<path>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { isFilePublished } from './lib/publish-gate.mjs';

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

function extractInsights(insightsDir, locale, msg) {
  const localeInsightsDir = path.join(insightsDir, locale);
  if (!fs.existsSync(localeInsightsDir)) return [];

  const insightsT = msg.Blog || {};
  const posts = [];

  for (const file of fs.readdirSync(localeInsightsDir).filter(f => f.endsWith('.mdx'))) {
    // 定时发布：未到日期的稿子不进搜索索引
    if (!isFilePublished(path.join(localeInsightsDir, file))) continue;
    const content = fs.readFileSync(path.join(localeInsightsDir, file), 'utf-8');
    const { data } = matter(content);
    const slug = data.slug || file.replace('.mdx', '');
    const title = data.title || '';
    const excerpt = data.excerpt || '';
    const category = data.category || '';
    const categoryKey = insightsT[category] || category;

    if (!title) continue;

    posts.push({
      type: 'insights',
      title,
      desc: excerpt.slice(0, 200),
      href: `/insights/${slug}/`,
      category: categoryKey,
      searchable: `${title} ${excerpt} ${category}`.toLowerCase(),
    });
  }
  return posts;
}

/**
 * 合规自查页（apps/portal/src/app/[locale]/c/check/<slug>/）。
 *
 * 真值 = 磁盘上真实存在的页面目录 —— 曾经按 msg.Check 的 *Title 键反推 slug，
 * 结果把 2284 个文案键（step1 / checkbtn / freeresult …）当成页面，
 * 往索引里塞了 2271 条 /c/check/step1/ 这类 404 链接，把真结果全淹了。
 */
function extractCheckPages(msg) {
  const dir = path.join(APPS_DIR, 'portal', 'src', 'app', '[locale]', 'c', 'check');
  if (!fs.existsSync(dir)) return [];

  const check = msg.Check || {};
  const items = [];
  for (const slug of fs.readdirSync(dir).sort()) {
    if (!fs.existsSync(path.join(dir, slug, 'page.tsx'))) continue;
    const title = check[`${slug}Title`] || slug;
    items.push({
      type: 'check',
      title,
      desc: check[`${slug}Desc`] || '',
      href: `/c/check/${slug}/`,
      searchable: `${title} ${check[`${slug}Desc`] || ''} ${slug}`.toLowerCase(),
    });
  }
  return items;
}

/**
 * 法规（apps/regulations）。法规不排期（全部即时可见），故不过 publish-gate。
 * 文号与发布机构也拼进 searchable —— 用户常直接搜「GACC Announcement No. 156」「SC」。
 */
function extractRegulations(regDir, locale) {
  const localeDir = path.join(regDir, locale);
  if (!fs.existsSync(localeDir)) return [];

  const docs = [];
  for (const file of fs.readdirSync(localeDir).filter((f) => f.endsWith('.mdx'))) {
    const content = fs.readFileSync(path.join(localeDir, file), 'utf-8');
    const { data } = matter(content);
    const title = data.title || '';
    if (!title) continue;
    const excerpt = data.excerpt || '';
    const docNumber = data.doc_number || '';
    const issuer = data.issuer || '';
    const category = data.category || '';
    docs.push({
      type: 'regulation',
      title,
      desc: excerpt.slice(0, 200),
      href: `/regulations/${file.replace(/\.mdx$/, '')}/`,
      category,
      searchable: `${title} ${excerpt} ${category} ${docNumber} ${issuer}`.toLowerCase(),
    });
  }
  return docs;
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

function generateIndex(messagesDir, insightsDir, regDir, locale) {
  const msg = loadMessages(messagesDir, locale);
  // Load portal messages to extract check page titles
  const portalMsgDir = path.join(APPS_DIR, 'portal', 'messages');
  if (fs.existsSync(portalMsgDir)) {
    const portalMsg = loadMessages(portalMsgDir, locale);
    Object.assign(msg, portalMsg);
  }
  return {
    services: extractServices(msg),
    insights: extractInsights(insightsDir, locale, msg),
    faq: extractFAQ(msg),
    regulations: extractRegulations(regDir, locale),
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

export function buildSearchIndexes(messagesDir, insightsDir, regDir, outDir) {
  const locales = getLocaleFiles(messagesDir).map(f => f.replace('.json', ''));
  console.log(`Generating search index for ${locales.length} locales...`);

  for (const locale of locales) {
    try {
      const index = generateIndex(messagesDir, insightsDir, regDir, locale);
      const outFile = path.join(outDir, `search-index-${locale}.json`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(index), 'utf-8');
      const total = index.services.length + index.insights.length + index.faq.length + index.regulations.length + index.checks.length;
      console.log('  ' + locale + ': ' + total + ' items (' + index.services.length + 'S + ' + index.insights.length + 'I + ' + index.faq.length + 'F + ' + index.regulations.length + 'R + ' + index.checks.length + 'C)');
    } catch (err) {
      console.error('  ' + locale + ': FAILED - ' + err.message);
    }
  }

  console.log('Done.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { 'out-dir': outDirArg } = parseArgs();

  // Read insights content from the insights app, not site
  const messagesDir = path.join(ROOT, 'apps', 'site', 'messages');
  const insightsDir = path.join(ROOT, 'apps', 'insights', 'content');
  const regDir = path.join(ROOT, 'apps', 'regulations', 'content');

  // Default outDir: project's public/ directory (derived from cwd)
  const defaultOutDir = path.join(process.cwd(), 'public');
  const outDir = outDirArg ? path.resolve(ROOT, outDirArg) : defaultOutDir;

  console.log('Apps discovered:', discoverApps().join(', '));
  buildSearchIndexes(messagesDir, insightsDir, regDir, outDir);
}
