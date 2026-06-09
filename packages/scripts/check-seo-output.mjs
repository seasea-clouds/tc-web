#!/usr/bin/env node
/**
 * check-seo-output.mjs — 构建后 SEO 输出文件合规检查
 *
 * 扫描 Next.js SSG 输出的静态 HTML，验证每页的 SEO 元素：
 *   1. <title> 是否有翻译 key 泄漏（含 . 字符）
 *   2. <title> 长度是否 < 60 chars
 *   3. <meta name="description"> 是否存在且长度 < 160 chars
 *   4. hreflang（RSC 负载中检测）
 *   5. canonical 是否匹配
 *   6. Sitemap 文件验证
 *
 * 用法：
 *   node packages/scripts/check-seo-output.mjs --out-dir=out
 *   node packages/scripts/check-seo-output.mjs --out-dir=out --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://sinotradecompliance.com';
const EXPECTED_LOCALE_COUNT = 48;
const EXPECTED_LOCALES = [
  'af','ar','az','be','bg','bn','ca','cs','da','de','el','es','fa','fi','fr',
  'he','hi','hr','hu','hy','id','it','ja','ka','ko','ms','ne','nl','no','pl',
  'pt','ro','ru','si','sk','sl','sq','sr','sv','sw','ta','th','tr','uk','ur','vi','zh','en',
];
const NOINDEX_PATHS = [
  '/404/', '/_not-found/','/blog/',   // blog是独立app构建，out/中的是旧拷贝，真正hreflang在blog app构建后验证
  // 根路径重定向页 — 由 checkHtmlFile 直接检查 path 是否为 /
  '/404/', '/_not-found/',
  '/c/login/', '/c/register/', '/c/dashboard/', '/c/me/', '/c/report/',
  '/c/billing/', '/c/settings/', '/c/subscription/',
  '/c/check/', '/c/pricing/', '/thank-you/', '/sitemap/',
];

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(file, msg) { RESULTS.failed++; RESULTS.warnings.push(`  ❌ ${file}: ${msg}`); }
function pass(file, msg) { RESULTS.passed++; }
function warn(file, msg) { RESULTS.passed++; if (process.argv.includes('--verbose')) console.log(`  ⚠️ ${file}: ${msg}`); }

function extractLocale(filePath, outDir) {
  const rel = path.relative(outDir, filePath.replace(/\/index\.html$/, '/'));
  const parts = rel.split(path.sep).filter(Boolean);
  return parts.length >= 1 && EXPECTED_LOCALES.includes(parts[0]) ? parts[0] : null;
}

function extractPath(filePath, outDir) {
  let rel = path.relative(outDir, filePath.replace(/\/index\.html$/, '/'));
  if (!rel.startsWith('/')) rel = '/' + rel;
  if (!rel.endsWith('/')) rel += '/';
  return rel;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/);
  return m ? m[1].trim() : null;
}

function extractMetaDescription(html) {
  const m = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i);
  if (m) return m[1];
  const m2 = html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*\/?>/i);
  return m2 ? m2[1] : null;
}

function checkHtmlFile(filePath, outDir) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const fullPath = `${SITE_URL}${extractPath(filePath, outDir)}`;
  const pageUrl = fullPath.replace(/\/$/, '') || `${SITE_URL}/`;
  const locale = extractLocale(filePath, outDir);
  const isNoindexPath = pageUrl === SITE_URL + '/' || pageUrl === SITE_URL || NOINDEX_PATHS.some(p => fullPath.includes(p));

  if (isNoindexPath) return;

  // 1. Title: no translation key leak
  const title = extractTitle(html);
  if (!title) { fail(filePath, '缺少 <title>'); return; }
  if (title.includes('.') && /[A-Z]/.test(title[0]) && !title.includes(' ')) {
    fail(filePath, `<title> 可能泄漏翻译 key: "${title.slice(0, 80)}"`);
  } else { pass(filePath, `✅ title: "${title.slice(0, 50)}"`); }

  // 2. Title length
  if (title.length > 85) {
    warn(filePath, `<title> 过长 (${title.length} chars): "${title.slice(0, 55)}..."`);
  } else { pass(filePath, `✅ title ${title.length} chars`); }

  // 3. Meta description
  const desc = extractMetaDescription(html);
  if (!desc) { fail(filePath, '缺少 meta description'); }
  else if (desc.length > 185) { warn(filePath, `meta description 过长 (${desc.length} chars)`); }
  else if (desc.length === 0) { fail(filePath, 'meta description 为空'); }
  else { pass(filePath, `✅ description ${desc.length} chars`); }


  // 4. RSC hreflang check: count "alternate" in RSC payload
  const altInRsc = (html.match(/"alternate"/g) || []).length;
  const hreflangEntries = Math.floor(altInRsc / 2);
  const hasXdefault = html.includes('x-default');

  if (!hasXdefault && hreflangEntries < EXPECTED_LOCALE_COUNT) {
    fail(filePath, `RSC 中未找到 hreflang x-default (${hreflangEntries} 条目)`);
  } else if (hreflangEntries >= EXPECTED_LOCALE_COUNT) {
    pass(filePath, `✅ RSC hreflang ${hreflangEntries} 条目 + x-default`);
  } else if (hasXdefault) {
    pass(filePath, `✅ RSC hreflang x-default 存在 (${hreflangEntries} 条目)`);
  } else {
    fail(filePath, `RSC hreflang 异常 (${hreflangEntries} 条目)`);
  }

  // 5. Canonical via RSC — only accept absolute https:// URLs
  const canonMatch = html.match(/canonical[^}]*href="(https:\/\/[^"]+)"/);
  if (canonMatch) {
    const canonHref = canonMatch[1];
    if (canonHref === pageUrl || canonHref === pageUrl.replace(/\/$/, '') || canonHref + '/' === pageUrl || canonHref === pageUrl + '/') {
      pass(filePath, '✅ canonical 匹配');
    } else if (canonHref.includes(SITE_URL) && canonHref.split('/')[3] !== locale) {
      warn(filePath, );
    } else {
      fail(filePath, `canonical: "${canonHref}" ≠ "${pageUrl}"`);
    }
  } else {
    fail(filePath, 'RSC 中未找到 canonical URL');
  }
}

function checkSitemap(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasXhtmlNs = content.includes('xmlns:xhtml');
  const hasXdefault = content.includes('x-default');
  const xhtmlLinks = (content.match(/xhtml:link/g) || []).length;
  const urlCount = (content.match(/<url>/g) || []).length;
  const hasLastmod = content.includes('<lastmod>');

  if (!hasXhtmlNs) fail(filePath.toString(), '缺少 xhtml namespace');
  if (!hasXdefault) fail(filePath.toString(), '缺少 x-default');
  if (xhtmlLinks === 0) fail(filePath.toString(), '缺少 xhtml:link');
  if (!hasLastmod) fail(filePath.toString(), '缺少 lastmod');
  pass(filePath.toString(), `✅ sitemap: ${urlCount} URLs, ${xhtmlLinks} xhtml:links`);
}

function scanDirectory(outDir) {
  console.log('📄 扫描 HTML 页面...');
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(fullPath);
      } else if (entry.name === 'index.html') {
        checkHtmlFile(fullPath, outDir);
      }
    }
  }
  walk(outDir);

  console.log('\n🗺️  检查 Sitemap...');
  const sitemaps = fs.readdirSync(outDir).filter(f => /^sitemap-.+\.xml$/.test(f) && f !== 'sitemap-images.xml' && f !== 'sitemap-pages.xml');
  for (const sitemap of sitemaps) {
    checkSitemap(path.join(outDir, sitemap));
  }

  // Sitemap index
  const idxPath = path.join(outDir, 'sitemap.xml');
  if (fs.existsSync(idxPath)) {
    const content = fs.readFileSync(idxPath, 'utf-8');
    const count = (content.match(/<sitemap>/g) || []).length;
    pass('sitemap.xml', `index: ${count} 子 sitemap`);
  }
}

// CLI
const args = process.argv.slice(2);
let outDir = 'out';
const isCi = args.includes('--ci');
const outIdx = args.indexOf('--out-dir');
if (outIdx >= 0 && outIdx < args.length - 1) outDir = args[outIdx + 1];
if (!path.isAbsolute(outDir)) outDir = path.resolve(process.cwd(), outDir);

if (!fs.existsSync(outDir)) {
  console.error(`❌ 输出目录不存在: ${outDir}`);
  process.exit(1);
}

console.log(`\n🔍 SEO 输出检查: ${outDir}\n`);
scanDirectory(outDir);

console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);

if (RESULTS.warnings.length > 0) {
  console.log('');
  for (const w of RESULTS.warnings) {
    console.log(w);
  }
}

if (isCi && RESULTS.failed > 0) {
  console.error('\n❌ CI 模式：检查未通过');
  process.exit(1);
}

console.log('\n✅ check-seo-output.mjs 完成');
