#!/usr/bin/env node
/**
 * check-wiring.mjs — 专治「写好了但没接上」
 *
 * 起因：站点出现两次同类 bug，形态完全一样——
 *   1) apps/site/src/components/FaqPageSchema.tsx 写好了，从没被 import
 *      → 6 个服务页有 FAQ 折叠块，却从不输出 FAQPage 结构化数据
 *   2) apps/site/public/.well-known/agent-skills/index.json 写了，全站零引用
 *      → 内容漂移到已废止的 Decree 248/249 也没人发现
 *
 * 共同点：不是写错，是没接。人记不住，就让 CI 记住。
 *
 * 规则：
 *   A. out/.well-known 下的每个 JSON 必须被 llms.txt 或某个 sitemap 引用
 *   B. 服务页有 FAQ 折叠块 ⇒ 必须输出 FAQPage，且条目数必须与折叠块数量一致
 *   C. 任何页面输出 FAQPage ⇒ 条目数必须与页面 <details> 数量一致（防止 schema 与 UI 脱节）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const LOCALES = [
  'af','ar','az','be','bg','bn','ca','cs','da','de','el','en','es','fa','fi','fr',
  'he','hi','hr','hu','hy','id','it','ja','ka','ko','ms','ne','nl','no','pl','pt',
  'ro','ru','si','sk','sl','sq','sr','sv','sw','ta','th','tr','uk','ur','vi','zh',
];

const FORBIDDEN_IN_WELL_KNOWN = /search-index|manifest\.json$/;

function listJsonFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listJsonFiles(full, acc);
    else if (e.name.endsWith('.json')) acc.push(full);
  }
  return acc;
}

/** A: .well-known 下的 JSON 必须被引用 */
function checkWellKnownReferenced(outDir) {
  const issues = [];
  const wk = path.join(outDir, '.well-known');
  if (!fs.existsSync(wk)) return issues;

  const llmsPath = path.join(outDir, 'llms.txt');
  const llms = fs.existsSync(llmsPath) ? fs.readFileSync(llmsPath, 'utf-8') : '';
  const sitemaps = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('sitemap') && f.endsWith('.xml'))
    .map((f) => fs.readFileSync(path.join(outDir, f), 'utf-8'))
    .join('\n');

  for (const file of listJsonFiles(wk)) {
    if (FORBIDDEN_IN_WELL_KNOWN.test(file)) continue;
    const rel = '/' + path.relative(outDir, file).split(path.sep).join('/');
    if (!llms.includes(rel) && !sitemaps.includes(rel)) {
      issues.push(`${rel} 未被 llms.txt 或 sitemap 引用（写好了没人用）`);
    }
  }
  return issues;
}

function parseFaqPage(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const d = JSON.parse(m[1]);
      if (d && d['@type'] === 'FAQPage' && Array.isArray(d.mainEntity)) return d;
    } catch {
      /* 单条 JSON-LD 解析失败交给 check-jsonld 报 */
    }
  }
  return null;
}

/** B + C: FAQ 折叠块 ⇔ FAQPage 一一对应 */
function checkFaqWiring(outDir) {
  const issues = [];
  let checked = 0;

  // B: 服务页必须输出 FAQPage
  for (const locale of LOCALES) {
    const svcDir = path.join(outDir, locale, 'services');
    if (!fs.existsSync(svcDir)) continue;
    for (const e of fs.readdirSync(svcDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(svcDir, e.name, 'index.html');
      if (!fs.existsSync(p)) continue;
      checked++;
      const html = fs.readFileSync(p, 'utf-8');
      const details = (html.match(/<details/g) || []).length;
      if (details === 0) continue;

      const faq = parseFaqPage(html);
      const rel = `/${locale}/services/${e.name}/`;
      if (!faq) {
        issues.push(`${rel} 有 ${details} 个 FAQ 折叠块，但没有输出 FAQPage schema`);
      } else if (faq.mainEntity.length !== details) {
        issues.push(
          `${rel} FAQPage 有 ${faq.mainEntity.length} 条，页面折叠块有 ${details} 条 —— 两处不一致`
        );
      }
    }
  }

  // C: 任何输出 FAQPage 的页面，schema 里的每条问答都必须真的出现在页面上
  //    （防 schema 编造页面没有的内容；不按 <details> 计数，因为各站 FAQ 渲染方式不同）
  const decode = (t) =>
    t
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));

  const stripTags = (html) =>
    decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ');

  for (const locale of LOCALES) {
    const locDir = path.join(outDir, locale);
    if (!fs.existsSync(locDir)) continue;
    walk(locDir, (p) => {
      if (!p.endsWith('.html')) return;
      const html = fs.readFileSync(p, 'utf-8');
      if (!html.includes('"FAQPage"')) return;
      const faq = parseFaqPage(html);
      if (!faq) return;
      const text = stripTags(html);
      const rel = '/' + path.relative(outDir, p).replace(/index\.html$/, '');
      for (const q of faq.mainEntity) {
        const question = decode(String(q.name || '')).replace(/\s+/g, ' ').trim();
        if (!question) continue;
        if (!text.includes(question)) {
          issues.push(`${rel} FAQPage 里的问答页面看不到：「${question.slice(0, 60)}」`);
          break;
        }
      }
    });
  }

  console.log(`  已检查 ${checked} 个服务页`);
  return issues;
}

function walk(dir, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, fn);
    else fn(full);
  }
}

export function runWiringCheck(outDir = path.join(ROOT, 'apps/site/out')) {
  console.log('\n🔍 接线检查（写好了有没有接上）...');
  const issues = [
    ...checkWellKnownReferenced(outDir),
    ...checkFaqWiring(outDir),
  ];
  if (issues.length) {
    console.log(`  ❌ ${issues.length} 项未接上：`);
    for (const i of issues.slice(0, 20)) console.log(`     - ${i}`);
    if (issues.length > 20) console.log(`     ... 另有 ${issues.length - 20} 项`);
    return issues.length;
  }
  console.log('  ✅ 全部接上（.well-known 被引用；FAQ 折叠块与 FAQPage 一一对应）');
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('check-wiring.mjs')) {
  // ci-check 会把 --project=xxx --out-dir=yyy 一并传进来，只认 --out-dir
  const arg = process.argv.slice(2).find((a) => a.startsWith('--out-dir='));
  const cwdOut = path.join(process.cwd(), 'out');
  const outDir = arg
    ? path.resolve(process.cwd(), arg.split('=')[1])
    : fs.existsSync(cwdOut)
      ? cwdOut
      : path.join(ROOT, 'apps/site/out');
  process.exit(runWiringCheck(outDir) > 0 ? 1 : 0);
}
