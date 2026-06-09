#!/usr/bin/env node
/**
 * check-rtl.mjs — RTL 支持检查
 *
 * 检查站点是否正确支持 RTL（从右到左）语言：
 *   ar（阿拉伯语）、he（希伯来语）、fa（波斯语）、ur（乌尔都语）
 *
 * 检查项：
 *   1. layout.tsx 中是否有 locale → dir="rtl" 映射逻辑
 *   2. 是否有 RTL CSS 规则（[dir="rtl"]）
 *   3. 是否使用逻辑属性（inset-inline-start 而非 left）
 *
 * 用法：
 *   node packages/scripts/check-rtl.mjs          # 普通模式
 *   node packages/scripts/check-rtl.mjs --ci     # CI 模式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

const LAYOUTS_TO_CHECK = [
  { name: 'site', file: 'apps/site/src/app/(site)/[locale]/layout.tsx' },
  { name: 'blog', file: 'apps/blog/src/app/[locale]/layout.tsx' },
  { name: 'portal', file: 'apps/portal/src/app/[locale]/layout.tsx' },
];

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(file, msg) {
  RESULTS.failed++;
  RESULTS.warnings.push(`  ❌ ${file}: ${msg}`);
}

function pass(file, msg) {
  RESULTS.passed++;
}

// ── Check 1: layout has dir=rtl logic ────────────────────────────────

function checkLayoutRtl(logic, filePath, appName) {
  const fileName = path.basename(filePath);

  // Pattern 1: Explicit dir mapping like dir={locale === 'ar' ? 'rtl' : 'ltr'}
  const hasDirMapping = /dir\s*=\s*{/.test(logic);
  
  // Pattern 2: RTL locale array/check function
  const hasRtlCheck = /rtl/i.test(logic) && (/(['"])ar\1/.test(logic) || /RTL/.test(logic));

  // Pattern 3: Conditional className/dir based on locale
  const hasLocaleConditional = /locale.*rtl|rtl.*locale/i.test(logic);

  if (hasDirMapping || hasRtlCheck || hasLocaleConditional) {
    pass(appName, fileName, '✅ 含 RTL 支持逻辑');
    return true;
  }

  fail(appName, fileName, `缺少 RTL 支持 — 需要为 ar/he/fa/ur 设置 dir="rtl"`);
  return false;
}

// ── Check 2: RTL CSS rules ──────────────────────────────────────────

function checkRtlCss(appName) {
  const cssDirs = [
    path.join(repoRoot, `apps/${appName}/src`),
    path.join(repoRoot, `packages/ui/src`),
  ];

  let rtlRules = 0;

  for (const dir of cssDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = findCssFiles(dir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(/\[dir=("|')rtl\1\]/g);
      if (matches) {
        rtlRules += matches.length;
      }
    }
  }

  if (rtlRules > 0) {
    pass(appName, 'CSS', `✅ 有 ${rtlRules} 条 [dir=rtl] CSS 规则`);
  } else {
    fail(appName, 'CSS', '未找到 [dir=rtl] CSS 规则 — 需要 RTL 样式覆盖');
  }
}

// ── Check 3: Logical CSS properties ──────────────────────────────────

function checkLogicalCss(appName) {
  const cssDirs = [
    path.join(repoRoot, `apps/${appName}/src`),
    path.join(repoRoot, `packages/ui/src`),
  ];

  const LOGICAL_PROPS = [
    'inset-inline-start', 'inset-inline-end',
    'padding-inline', 'padding-inline-start', 'padding-inline-end',
    'margin-inline', 'margin-inline-start', 'margin-inline-end',
    'border-inline', 'border-inline-start', 'border-inline-end',
    'text-align: start', 'text-align: end',
  ];

  let logicalCount = 0;
  let physicalLeft = 0;

  for (const dir of cssDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = findCssFiles(dir);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const prop of LOGICAL_PROPS) {
        logicalCount += (content.match(new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      }
      // Check for physical left/right that should be logical
      const physicalProps = content.match(/:\s*(left|right)\s*;/g);
      if (physicalProps) {
        physicalLeft += physicalProps.length;
      }
    }
  }

  if (logicalCount > 0) {
    pass(appName, 'CSS', `✅ 使用 ${logicalCount} 处逻辑属性`);
  }

  if (physicalLeft > 10) {
    fail(appName, 'CSS', `仍使用 ${physicalLeft} 处物理 left/right — 建议改为 inset-inline-start/end`);
  } else if (physicalLeft > 0) {
    pass(appName, 'CSS', `⏳ ${physicalLeft} 处物理 left/right，风险较低`);
  }
}

function findCssFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findCssFiles(fullPath));
    } else if (entry.name.endsWith('.css')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────

function scanApp(app) {
  console.log(`\n📁 ${app.name}/`);

  // Check layout
  const layoutPath = path.join(repoRoot, app.file);
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf-8');
    checkLayoutRtl(content, layoutPath, app.name);
  } else {
    fail(app.name, app.file, 'layout.tsx 文件不存在');
  }

  // Check CSS
  checkRtlCss(app.name);
  checkLogicalCss(app.name);
}

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

for (const app of LAYOUTS_TO_CHECK) {
  scanApp(app);
}

console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);

if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.join('\n'));
  
  // Output fix suggestions
  console.log('\n💡 修复建议:');
  console.log('  在 layout.tsx 的 <html> 标签添加:');
  console.log('    <html lang={locale} dir={locale === "ar" || locale === "he" || locale === "fa" || locale === "ur" ? "rtl" : "ltr"}>');
  console.log('  并在 globals.css 添加:');
  console.log('    [dir="rtl"] { text-align: right; }');
  console.log('    [dir="rtl"] .flex-row { flex-direction: row-reverse; }');
}

if (isCi && RESULTS.failed > 0) {
  console.error('\n❌ CI 模式：检查未通过');
  process.exit(1);
}

console.log('\n✅ check-rtl.mjs 完成');
