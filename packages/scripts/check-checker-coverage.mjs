#!/usr/bin/env node
/**
 * check-checker-coverage.mjs — 元检查器：检查「检查器」自己有没有静默失效
 *
 * 背景（2026-11 blog → insights 改名时实际踩到）：
 * check-seo-patterns.mjs / check-rtl.mjs / check-msg-override.mjs / check-md-article.mjs
 * 都用「项目名 → 路径」的硬编码映射表。改名后键对不上，脚本不报错、直接
 * `process.exit(0)` 跳过 —— 于是四个检查器全站静默失效，CI 依然全绿。
 *
 * 这类缺陷的共性是：**检查器的覆盖面靠人手维护，没人核对过**。
 * 本脚本把「覆盖面」本身变成断言：
 *   A. apps/ 下每个真实存在的子站，只要具备某项特征（有 messages 目录、
 *      有 [locale] layout、有 [locale] 路由），就必须出现在对应检查器的映射表里
 *   B. 映射表里的每个键都必须对应真实目录（防止改名后留下死键）
 *   C. 显式列出「有意不覆盖」的子站，写清原因，避免用沉默代替决定
 *
 * 用法：
 *   node packages/scripts/check-checker-coverage.mjs
 *   node packages/scripts/check-checker-coverage.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const appsDir = path.join(repoRoot, 'apps');
const scriptsDir = path.join(repoRoot, 'packages/scripts');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

const RESULTS = { passed: 0, failed: 0, warnings: [] };
const fail = (m) => { RESULTS.failed++; RESULTS.warnings.push(`  ❌ ${m}`); };
const pass = () => { RESULTS.passed++; };

// ── 已知子站 ──
const apps = fs.readdirSync(appsDir).filter((d) => {
  const full = path.join(appsDir, d);
  if (!fs.statSync(full).isDirectory()) return false;
  return ['package.json', 'src', 'tsconfig.json', 'next.config.mjs', 'next.config.js']
    .some((f) => fs.existsSync(path.join(full, f)));
});

const hasMessages = (a) => fs.existsSync(path.join(appsDir, a, 'messages'));
const hasLocaleLayout = (a) => {
  for (const p of [
    path.join(appsDir, a, 'src/app/[locale]/layout.tsx'),
    path.join(appsDir, a, `src/app/(${a})/[locale]/layout.tsx`),
  ]) if (fs.existsSync(p)) return true;
  // 非标准的 (site) 形式
  const srcApp = path.join(appsDir, a, 'src/app');
  if (!fs.existsSync(srcApp)) return false;
  for (const entry of fs.readdirSync(srcApp)) {
    const cand = path.join(srcApp, entry, '[locale]', 'layout.tsx');
    if (fs.existsSync(cand)) return true;
  }
  return false;
};

/**
 * 从检查器源码里提取某个映射表的键。
 * 靠「变量名 + 紧跟的 { ... } 块」定位，块内取形如 `key: ` 或 `'key': ` 的键。
 */
function extractMapKeys(scriptFile, varName) {
  const file = path.join(scriptsDir, scriptFile);
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf-8');
  const start = src.indexOf(varName);
  if (start === -1) return null;
  const open = src.indexOf('{', start);
  if (open === -1) return null;
  // 括号配平
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const block = src.slice(open, end);
  const keys = new Set();
  for (const m of block.matchAll(/(?:^|[,{\n])\s*['"]?([A-Za-z0-9_-]+)['"]?\s*:/g)) keys.add(m[1]);
  return keys;
}

/** 数组形式：const APPS = ['site', 'portal', ...] */
function extractArrayItems(scriptFile, varName) {
  const file = path.join(scriptsDir, scriptFile);
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf-8');
  const m = src.match(new RegExp(`${varName}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/['"]([A-Za-z0-9_-]+)['"]/g)].map((x) => x[1]));
}

// 有意不覆盖的子站 —— 用沉默代替决定是这类缺陷的根源，所以必须显式写出来
const INTENTIONALLY_EXEMPT = {
  'check-msg-override.mjs': {
    regulations: '法规库 messages 无 override 场景（文案全在 mdx 正文）',
    admin: '后台单语言（zh/en），不使用共享 UI 的 48 语言 messages',
  },
  'check-rtl.mjs': {
    admin: 'admin 无 locale 路由，不做 RTL',
  },
  'check-seo-patterns.mjs': {
    admin: 'admin 是登录后台，不参与 SEO',
  },
};

// ════════════════════════════════════════════════════════
// 一、按特征断言覆盖面
// ════════════════════════════════════════════════════════
const CHECKS = [
  {
    script: 'check-msg-override.mjs',
    varName: 'APPS',
    feature: 'messages 目录',
    appliesTo: (a) => hasMessages(a),
    why: '有 messages 目录就该检查共享 UI 文案覆盖',
  },
  {
    script: 'check-rtl.mjs',
    varName: 'LAYOUT_FILE_BY_PROJECT',
    feature: '[locale] layout',
    appliesTo: (a) => hasLocaleLayout(a),
    why: '有 [locale] layout 就该检查 dir=rtl',
  },
  {
    script: 'check-seo-patterns.mjs',
    varName: 'APP_DIR_MAP',
    feature: '[locale] 路由目录',
    appliesTo: (a) => hasLocaleLayout(a),
    why: '有 [locale] 页面就该检查 generateMetadata / canonical',
  },
];

console.log('\n🔍 一、检查器映射表 vs 真实子站');
for (const c of CHECKS) {
  const keys = extractMapKeys(c.script, c.varName);
  if (!keys) {
    fail(`${c.script} 找不到 ${c.varName}（映射表被改名或删除了？改了就得同步改本检查器）`);
    continue;
  }
  const exempt = INTENTIONALLY_EXEMPT[c.script] || {};
  for (const app of apps) {
    if (!c.appliesTo(app)) continue;
    if (keys.has(app) || app in exempt) { pass(); continue; }
    fail(
      `${c.script} 的 ${c.varName} 缺 "${app}"` +
      `（该子站有${c.feature}，${c.why}）—— 不改的话它会静默跳过`,
    );
  }
}

// ════════════════════════════════════════════════════════
// 二、映射表里不能有死键（改名后的残留）
// ════════════════════════════════════════════════════════
console.log('\n🔍 二、映射表死键（目录已不存在）');
const DASHBOARD_PROJECTS = new Set(apps);
for (const c of CHECKS) {
  const keys = extractMapKeys(c.script, c.varName);
  if (!keys) continue;
  for (const k of keys) {
    if (DASHBOARD_PROJECTS.has(k)) { pass(); continue; }
    fail(`${c.script} 的 ${c.varName} 里有死键 "${k}"（apps/${k} 不存在，改名后残留）`);
  }
}

// ════════════════════════════════════════════════════════
// 三、sync-icons 的 APPS 数组
// ════════════════════════════════════════════════════════
console.log('\n🔍 三、sync-icons 子站清单');
const iconApps = extractArrayItems('sync-icons.mjs', 'APPS');
if (iconApps) {
  for (const app of apps) {
    if (iconApps.has(app)) pass();
    else fail(`sync-icons.mjs 的 APPS 缺 "${app}"（该子站不会同步图标）`);
  }
  for (const k of iconApps) {
    if (!apps.includes(k)) fail(`sync-icons.mjs 的 APPS 里有死键 "${k}"`);
    else pass();
  }
} else {
  RESULTS.warnings.push('  ⚠️ sync-icons.mjs 找不到 APPS 数组，跳过');
}

// ════════════════════════════════════════════════════════
// 四、豁免说明必须写清原因（防止用沉默掩盖）
// ════════════════════════════════════════════════════════
console.log('\n🔍 四、豁免项都有文字说明');
for (const [script, map] of Object.entries(INTENTIONALLY_EXEMPT)) {
  for (const [app, reason] of Object.entries(map)) {
    if (!reason || reason.length < 6) fail(`${script} 对 "${app}" 的豁免没写清原因`);
    else pass();
  }
}

console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);
console.log(`   子站清单: ${apps.join(' / ')}`);
if (RESULTS.warnings.length > 0) console.log('\n' + RESULTS.warnings.join('\n'));
if (isCi && RESULTS.failed > 0) process.exit(1);
console.log('\n✅ check-checker-coverage.mjs 完成');
