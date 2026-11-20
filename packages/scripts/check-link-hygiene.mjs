#!/usr/bin/env node
/**
 * check-link-hygiene.mjs — 域名与图片卫生检查（构建产物级）
 *
 * 目的：把「主域唯一」「图片可索引」这两类问题卡在 CI，而不是等上线后人工发现。
 * 教训来源（2026-11-05）：
 *   - 博客图片文件名全是 fig-01.webp，改名后旧地址一堆 301；
 *   - 正文图没有 width/height，加载时页面跳动（CLS）；
 *   - 图片 sitemap 只挂英文页，另外 47 个语言的图片入口等于放弃；
 *   - 三个子站的 *.pages.dev 域名没有任何 noindex，会被搜索引擎当重复内容收录。
 *
 * 检查项：
 *   A. 产物 HTML 中不得出现自家非主域域名（pages.dev / 子站域名 / www / http / localhost）
 *   B. canonical / og:url / hreflang / JSON-LD 中的自家 URL 必须是 https 主域
 *   C. sitemap*.xml / robots.txt / llms.txt 中的自家 URL 必须是 https 主域
 *   D. 产物里每张 <img> 必须有非空 alt（装饰图允许 alt="" + aria-hidden）
 *   E. 产物里正文图必须带 width/height（有 class 含 rounded-lg 的是正文图）
 *   F. <figure> 必须配 <figcaption>
 *   G. 图片 sitemap：<loc> 必须是页面 URL；每个有图语言页都要出现；必须有 image:title
 *
 * 用法:
 *   node check-link-hygiene.mjs --out-dir=out --ci
 *   node check-link-hygiene.mjs --out-dir=out --project=insights
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const MAIN_HOST = 'sinotradecompliance.com';
/** 自家域名里不允许出现的变体（正则） */
const BAD_SELF_HOSTS = [
  /\b[\w-]+\.pages\.dev\b/i,
  /\b(?:insights|blog|portal|admin|regulations|site)\.sinotradecompliance\.com\b/i,
  /\bwww\.sinotradecompliance\.com\b/i,
  /\bhttp:\/\/sinotradecompliance\.com\b/i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/i,
];

const failures = [];
const warnings = [];

function fail(check, detail) { failures.push(`[${check}] ${detail}`); }
function warn(check, detail) { warnings.push(`[${check}] ${detail}`); }

function parseArgs() {
  const args = { outDir: null, project: null, ci: false };
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    if (m[1] === 'out-dir') args.outDir = m[2];
    else if (m[1] === 'project') args.project = m[2];
    else if (m[1] === 'ci') args.ci = true;
  }
  if (!args.outDir) args.outDir = 'out';
  return args;
}

function walk(dir, filter, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, acc);
    else if (filter(entry.name)) acc.push(full);
  }
  return acc;
}

/** A：产物 HTML 中不得出现自家非主域域名 */
function checkHostLeaks(htmlFiles) {
  const leaks = new Map();
  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, 'utf-8');
    // RSC / 内联脚本里可能有转义写法，统一还原常见实体
    const decoded = text.replace(/\\u002F/g, '/').replace(/&quot;/g, '"');
    for (const re of BAD_SELF_HOSTS) {
      const hits = decoded.match(new RegExp(re.source, 'gi'));
      if (!hits) continue;
      for (const hit of hits) {
        const rel = path.relative(REPO_ROOT, file);
        const key = `${hit}`;
        if (!leaks.has(key)) leaks.set(key, new Set());
        leaks.get(key).add(rel);
      }
    }
  }
  for (const [host, files] of leaks) {
    const sample = [...files].slice(0, 3).join(', ');
    fail('A 域名泄漏', `产物里出现「${host}」（${files.size} 个页面，如 ${sample}）`);
  }
}

/** B：canonical / og:url / hreflang / JSON-LD 的自家 URL 必须是 https 主域 */
function checkSeoUrls(htmlFiles) {
  const REL = /https?:\/\/([a-z0-9.-]*sinotradecompliance\.com)(?=[/"'<\s]|$)/gi;
  let checked = 0;
  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const m of text.matchAll(REL)) {
      checked += 1;
      if (m[1] !== MAIN_HOST || m[0].startsWith('http://')) {
        fail('B SEO URL', `${path.relative(REPO_ROOT, file)}: ${m[0]}`);
      }
    }
  }
  return checked;
}

/** C：sitemap / robots / llms 中的自家 URL 必须是 https 主域 */
function checkMetaFiles(outDir) {
  const files = ['robots.txt', 'llms.txt', 'llms-full.txt'].map(f => path.join(outDir, f)).filter(fs.existsSync);
  const sitemaps = walk(outDir, n => /^sitemap.*\.xml$/i.test(n));
  for (const file of [...files, ...sitemaps]) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]*sinotradecompliance\.com)/gi)) {
      if (m[1] !== MAIN_HOST || m[0].startsWith('http://')) {
        fail('C 元文件 URL', `${path.relative(REPO_ROOT, file)}: ${m[0]}`);
      }
    }
  }
  return sitemaps;
}

/** D/E/F：产物里 img 的 alt 与宽高、figure 与 figcaption 配对 */
function checkImages(htmlFiles) {
  let imgTotal = 0;
  let missingAlt = 0;
  let bodyImgNoSize = 0;
  let figureNoCaption = 0;
  const samples = { alt: [], size: [], caption: [] };

  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, 'utf-8');

    for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      imgTotal += 1;
      const hasAlt = /\balt=/.test(tag);
      const emptyAlt = /\balt=""\s*/.test(tag) || /\balt=""\s*\/?>/.test(tag);
      const ariaHidden = /\baria-hidden="true"/.test(tag);
      if (!hasAlt) {
        missingAlt += 1;
        if (samples.alt.length < 3) samples.alt.push(`${path.relative(REPO_ROOT, file)} → 缺少 alt 属性`);
      } else if (emptyAlt && !ariaHidden) {
        // 空 alt 且没标 aria-hidden：装饰图应显式声明 aria-hidden，否则视为漏写
        missingAlt += 1;
        if (samples.alt.length < 3) samples.alt.push(`${path.relative(REPO_ROOT, file)} → alt="" 但无 aria-hidden`);
      }
      // 正文图特征：class 里有 rounded-lg（markdown 渲染的正文图）
      const isBodyImg = /class="[^"]*rounded-lg/.test(tag);
      if (isBodyImg && !(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag))) {
        bodyImgNoSize += 1;
        if (samples.size.length < 3) samples.size.push(`${path.relative(REPO_ROOT, file)} → 正文图缺 width/height`);
      }
    }

    const figures = (text.match(/<figure\b/gi) || []).length;
    const captions = (text.match(/<figcaption\b/gi) || []).length;
    if (figures > captions) {
      figureNoCaption += figures - captions;
      if (samples.caption.length < 3) samples.caption.push(`${path.relative(REPO_ROOT, file)} → figure ${figures} 个但 figcaption ${captions} 个`);
    }
  }

  if (missingAlt > 0) fail('D 图片 alt', `${missingAlt} 张图缺 alt 或未标 aria-hidden；${samples.alt.join(' | ')}`);
  if (bodyImgNoSize > 0) fail('E 图片宽高', `${bodyImgNoSize} 张正文图缺 width/height（会影响 CLS）；${samples.size.join(' | ')}`);
  if (figureNoCaption > 0) fail('F figcaption', `${figureNoCaption} 处 figure 没有配 figcaption；${samples.caption.join(' | ')}`);
  return imgTotal;
}

/** G：图片 sitemap 结构 + 覆盖 */
function checkImageSitemap(sitemaps) {
  const imgMap = sitemaps.find(f => path.basename(f) === 'sitemap-images.xml');
  if (!imgMap) {
    warn('G 图片 sitemap', '未找到 sitemap-images.xml（若本站不产出图片 sitemap 可忽略）');
    return;
  }
  const xml = fs.readFileSync(imgMap, 'utf-8');
  const pageLocs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const imgLocs = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(m => m[1]);
  const titles = (xml.match(/<image:title>/g) || []).length;

  if (imgLocs.length === 0) {
    warn('G 图片 sitemap', 'sitemap-images.xml 里没有任何 <image:image>');
    return;
  }
  // <loc> 必须是页面 URL，不能是图片文件本身
  const badLoc = pageLocs.filter(u => /\.(webp|jpg|jpeg|png)$/i.test(u));
  if (badLoc.length) fail('G 图片 sitemap', `${badLoc.length} 个 <loc> 直接指向图片文件（应指向所在页面）：${badLoc[0]}`);

  // 每条 image:image 应配 image:title
  if (titles < imgLocs.length) {
    fail('G 图片 sitemap', `${imgLocs.length} 张图只有 ${titles} 条 image:title`);
  }

  // 语言覆盖：有图文章的语言页都应在 sitemap 里
  const localesFile = path.join(REPO_ROOT, 'packages/ui/locales.json');
  const coverDir = path.join(REPO_ROOT, 'apps/insights/public/images/insights');
  if (fs.existsSync(localesFile) && fs.existsSync(coverDir)) {
    const locales = JSON.parse(fs.readFileSync(localesFile, 'utf-8'));
    const slugs = fs.readdirSync(coverDir).filter(s => fs.statSync(path.join(coverDir, s)).isDirectory());
    const missing = [];
    for (const locale of locales) {
      for (const slug of slugs) {
        const mdx = path.join(REPO_ROOT, 'apps/insights/content', locale, `${slug}.mdx`);
        if (!fs.existsSync(mdx)) continue;
        const pageUrl = `https://${MAIN_HOST}/${locale}/insights/${slug}/`;
        if (!pageLocs.includes(pageUrl)) missing.push(`/${locale}/insights/${slug}/`);
      }
    }
    if (missing.length) {
      fail('G 图片 sitemap 覆盖', `${missing.length} 个有图语言页未进图片 sitemap，如 ${missing.slice(0, 3).join(', ')}`);
    }
  }
}

/** H：内容级图片检查（源码，不需编译）—— 文件名语义化 / 文件存在 / alt 非空 */
function checkContentImages() {
  const contentRoot = path.join(REPO_ROOT, 'apps/insights/content');
  const publicRoot = path.join(REPO_ROOT, 'apps/insights/public');
  if (!fs.existsSync(contentRoot)) return 0;

  const BAD_NAME = /\/(?:fig-\d+|image\d*|img-?\d+)\.(?:webp|jpg|jpeg|png)$/i;
  const files = walk(contentRoot, n => n.endsWith('.mdx'));
  const badNames = new Set();
  const missingFiles = new Set();
  const emptyAlt = new Set();
  let total = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const m of text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
      const [, alt, src] = m;
      total += 1;
      const rel = path.relative(REPO_ROOT, file);
      if (BAD_NAME.test(src)) badNames.add(`${rel} → ${src}`);
      if (src.startsWith('/images/') && !fs.existsSync(path.join(publicRoot, src.replace(/^\//, '')))) {
        missingFiles.add(`${rel} → ${src}`);
      }
      if (!alt.trim()) emptyAlt.add(rel);
    }
  }

  if (badNames.size) fail('H 图片文件名', `${badNames.size} 处用 fig-NN / imageN 这类无意义文件名（应为描述性英文名）：${[...badNames][0]}`);
  if (missingFiles.size) fail('H 图片文件', `${missingFiles.size} 处引用的图片文件不存在：${[...missingFiles][0]}`);
  if (emptyAlt.size) fail('H 图片 alt', `${emptyAlt.size} 个文件里有空 alt 的图片：${[...emptyAlt][0]}`);
  return total;
}

/** 主流程 */
const args = parseArgs();
const outDir = path.resolve(process.cwd(), args.outDir);
if (!fs.existsSync(outDir)) {
  checkContentImages();
  if (failures.length) {
    for (const f of failures) console.log(`  ❌ ${f}`);
    if (args.ci) process.exit(1);
  }
  console.log(`⚠️ 未找到产物目录 ${args.outDir}，仅完成源码级图片检查`);
  process.exit(0);
}

const htmlFiles = walk(outDir, n => n.endsWith('.html'));
if (htmlFiles.length === 0) {
  checkContentImages();
  if (failures.length) {
    for (const f of failures) console.log(`  ❌ ${f}`);
    if (args.ci) process.exit(1);
  }
  console.log('⚠️ 产物里没有 HTML，仅完成源码级图片检查');
  process.exit(0);
}

const contentImages = checkContentImages();
console.log(`▶ check-link-hygiene.mjs (${args.project || 'auto'}, ${htmlFiles.length} HTML, ${contentImages} content imgs)`);

checkHostLeaks(htmlFiles);
const seoUrls = checkSeoUrls(htmlFiles);
const sitemaps = checkMetaFiles(outDir);
const imgTotal = checkImages(htmlFiles);
checkImageSitemap(sitemaps);

const summary = `${htmlFiles.length} pages, ${imgTotal} imgs, ${seoUrls} self URLs`;
if (failures.length) {
  for (const f of failures) console.log(`  ❌ ${f}`);
  for (const w of warnings) console.log(`  ⚠️ ${w}`);
  console.log(`❌ 链接/图片卫生检查失败（${summary}）`);
  if (args.ci) process.exit(1);
  process.exit(0);
}
for (const w of warnings) console.log(`  ⚠️ ${w}`);
console.log(`✅ 链接/图片卫生检查通过（${summary}）`);
