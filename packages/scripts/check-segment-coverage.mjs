#!/usr/bin/env node
/**
 * check-segment-coverage.mjs — admin 热门页面的「路径 → 中文名」映射覆盖检查
 *
 * 背景（2026-11-25 实际踩到）：
 * admin 数据看板的「热门页面」把 URL 拆成路径段显示面包屑，映射分三层：
 *   ① STATIC_SEGMENT_LABELS（dashboard/page.tsx，静态路由段）
 *   ② INSIGHTS_SEGMENT_LABELS / REGULATIONS_SEGMENT_LABELS（自动生成的文章 slug）
 *   ③ 兜底 → 直接把英文路径段首字母大写
 * 当时 regulations（7 天 27399 次访问，全站最大的路径段）和 83 篇法规文章
 * 全落到兜底，页面路径列显示成 "Regulations › Gacc Announcement 150 ..."。
 * 根因是 generate-segment-mapping.mjs 只扫 insights 内容目录，没人发现漏了法规库。
 *
 * 这个检查器把「映射必须覆盖全部真实路由」变成硬门禁。
 *
 * 检查项：
 *   A. known-routes 里的每个路径段都必须有中文映射（纯数字页码除外）
 *   B. STATIC_SEGMENT_LABELS 引用的 segment.* 键必须在 admin en/zh messages 里存在
 *   C. 映射表里的文章 slug 必须仍有对应内容文件（防止删稿后的残留映射）
 *
 * 用法：
 *   node packages/scripts/check-segment-coverage.mjs
 *   node packages/scripts/check-segment-coverage.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const KNOWN_ROUTES = path.join(repoRoot, 'apps/admin/functions/lib/known-routes.ts');
const DASHBOARD = path.join(repoRoot, 'apps/admin/src/app/dashboard/page.tsx');
const SEGMENT_MAP = path.join(repoRoot, 'apps/admin/src/lib/segment-mapping.ts');
const ADMIN_MSG = path.join(repoRoot, 'apps/admin/messages');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(msg) {
  RESULTS.failed++;
  RESULTS.warnings.push(`  ❌ ${msg}`);
}
function pass() {
  RESULTS.passed++;
}

// ── 前置：文件齐全 ──
for (const f of [KNOWN_ROUTES, DASHBOARD, SEGMENT_MAP]) {
  if (!fs.existsSync(f)) {
    console.log(`  ∎ check-segment-coverage.mjs → ∅ 缺少 ${path.relative(repoRoot, f)}`);
    process.exit(0);
  }
}

// ── 提取 known-routes 的全部路径段 ──
const routesSrc = fs.readFileSync(KNOWN_ROUTES, 'utf-8');
const routes = [
  ...routesSrc.matchAll(/"(\/[^"]*)"/g),
  ...routesSrc.matchAll(/'(\/[^']*)'/g),
].map((m) => m[1]);

const segments = new Map(); // segment → 出现的路由数
for (const route of routes) {
  let segs = route.split('?')[0].split('/').filter(Boolean);
  if (segs.length > 0 && /^[a-z]{2}$/.test(segs[0])) segs = segs.slice(1);
  for (const s of segs) segments.set(s, (segments.get(s) || 0) + 1);
}

if (segments.size === 0) {
  console.log('  ∎ check-segment-coverage.mjs → ∅ known-routes 里没解析出路径，跳过');
  process.exit(0);
}

// ── 提取三层映射 ──
const dashSrc = fs.readFileSync(DASHBOARD, 'utf-8');
const staticBlock = dashSrc.slice(
  dashSrc.indexOf('const STATIC_SEGMENT_LABELS'),
  dashSrc.indexOf('/** Parse a URL path'),
);
const staticLabels = new Map(); // segment → 'segment.xxx'
for (const m of staticBlock.matchAll(/^\s*'([^']+)':\s*'(segment\.[\w]+)'/gm)) {
  staticLabels.set(m[1], m[2]);
}

const mapSrc = fs.readFileSync(SEGMENT_MAP, 'utf-8');
const articleSlugs = new Set();
for (const m of mapSrc.matchAll(/^\s*'([^']+)':\s*`/gm)) articleSlugs.add(m[1]);

// 分页段由代码特殊处理（page + 数字 → 「第 N 页」），不需要映射表条目
const SPECIAL = new Set(['page']);

const isKnown = (s) => staticLabels.has(s) || articleSlugs.has(s) || SPECIAL.has(s);

// ════════════════════════════════════════════════════════
// A. 覆盖完整性
// ════════════════════════════════════════════════════════
console.log('\n🔍 A. 路由段 → 中文名 映射覆盖');
const missing = [];
for (const [seg, count] of [...segments.entries()].sort((a, b) => b[1] - a[1])) {
  if (/^\d+$/.test(seg)) continue; // 纯数字 = 分页页码
  if (isKnown(seg)) {
    pass();
  } else {
    missing.push({ seg, count });
  }
}

if (missing.length > 0) {
  for (const { seg, count } of missing.slice(0, 20)) {
    fail(`路径段 "${seg}" 无中文映射（影响 ${count} 条路由）`);
  }
  if (missing.length > 20) {
    RESULTS.warnings.push(`  … 另有 ${missing.length - 20} 个未列出`);
  }
  RESULTS.warnings.push(
    '  💡 静态路由段 → 加到 dashboard/page.tsx 的 STATIC_SEGMENT_LABELS（并在 admin messages 加 segment.* 键）',
  );
  RESULTS.warnings.push(
    '  💡 文章 slug → 确认 generate-segment-mapping.mjs 已扫描该内容目录',
  );
} else {
  console.log(`  ✅ ${segments.size} 个路径段全部有映射${articleSlugs.size ? `（含 ${articleSlugs.size} 个文章 slug）` : ''}`);
}

// ════════════════════════════════════════════════════════
// B. segment.* 键在 admin messages 里存在
// ════════════════════════════════════════════════════════
console.log('\n🔍 B. segment.* 翻译键存在性');
let adminMsgs = null;
for (const locale of ['en', 'zh']) {
  const f = path.join(ADMIN_MSG, `${locale}.json`);
  if (!fs.existsSync(f)) {
    fail(`缺少 admin/messages/${locale}.json`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
  if (!adminMsgs) adminMsgs = new Set(Object.keys(data));
  for (const [seg, key] of staticLabels) {
    if (!(key in data)) {
      fail(`路径段 "${seg}" 引用的 "${key}" 在 admin/messages/${locale}.json 不存在`);
    } else {
      pass();
    }
  }
}

// ════════════════════════════════════════════════════════
// C. 文章 slug 映射没有残留（内容被删但映射还在）
// ════════════════════════════════════════════════════════
console.log('\n🔍 C. 文章 slug 映射无残留');
const contentDirs = [
  'apps/insights/content/en',
  'apps/regulations/content/en',
];
const realSlugs = new Set();
for (const d of contentDirs) {
  const full = path.join(repoRoot, d);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.endsWith('.mdx')) realSlugs.add(f.replace(/\.mdx$/, ''));
  }
}
if (realSlugs.size === 0) {
  console.log('  ∎ 未找到内容目录，跳过');
} else {
  const stale = [...articleSlugs].filter((s) => !realSlugs.has(s));
  if (stale.length > 0) {
    for (const s of stale.slice(0, 10)) fail(`映射里的 "${s}" 已无对应内容文件（重新跑 generate-segment-mapping.mjs）`);
    if (stale.length > 10) RESULTS.warnings.push(`  … 另有 ${stale.length - 10} 个残留`);
  } else {
    console.log(`  ✅ ${articleSlugs.size} 个文章 slug 均有对应内容文件`);
    pass();
  }
}

// ── 汇总 ──
console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);
if (RESULTS.warnings.length > 0) console.log('\n' + RESULTS.warnings.join('\n'));
if (isCi && RESULTS.failed > 0) process.exit(1);
console.log('\n✅ check-segment-coverage.mjs 完成');
