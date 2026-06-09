#!/usr/bin/env node
/**
 * check-seo-patterns.mjs — 构建前 SEO 代码模式检查
 *
 * 检查项：
 *   1. 每个 [locale]/page.tsx 是否导出 generateMetadata
 *   2. 禁止使用 Object.fromEntries + locales.map 手动拼 languages
 *   3. alternates 对象是否包含 languages 属性
 *   4. canonical URL 是否显式声明
 *
 * 用法：
 *   node packages/scripts/check-seo-patterns.mjs          # 普通模式
 *   node packages/scripts/check-seo-patterns.mjs --ci     # CI 模式（失败时 exit 1）
 *   node packages/scripts/check-seo-patterns.mjs --fix    # 自动修复（仅部分项）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const APPS = [
  { name: 'site', dir: 'apps/site/src/app/(site)/[locale]' },
  { name: 'blog', dir: 'apps/blog/src/app/[locale]' },
  { name: 'portal', dir: 'apps/portal/src/app/[locale]' },
];

// Page paths that are intentionally exempt from generateMetadata
const METADATA_EXEMPT = [
  'layout.tsx',            // layout has its own generateMetadata
  'not-found.tsx',         // Next.js built-in
  'loading.tsx',           // Next.js built-in
  'error.tsx',             // Next.js built-in
];

// Client-component files that are NOT page routes (helpers, hooks, providers)
const CLIENT_COMPONENT_EXEMPT = [
  'check-client.tsx',
  'BlogClient.tsx',
];

// Portal route patterns that are intentionally auth-only (no SEO metadata needed)
const PORTAL_AUTH_ROUTES = [
  '/c/login/',
  '/c/register/',
  '/c/dashboard/',
  '/c/dashboard/billing/',
  '/c/dashboard/reports/',
  '/c/me/',
  '/c/me/reports/',
  '/c/me/settings/',
  '/c/me/subscription/',
  '/c/report/',
  '/c/report/preview/',
];

// Portal pages that inherit metadata from parent layout
const PORTAL_LAYOUT_INHERIT = [
  '/c/',        // inherits from portal/[locale]/layout.tsx → path=/c/
  '/c/pricing/',
];

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(app, file, msg) {
  RESULTS.failed++;
  RESULTS.warnings.push(`❌ [${app}] ${file}: ${msg}`);
}

function pass(app, file, msg) {
  RESULTS.passed++;
}

// ── Check 1: generateMetadata export ──────────────────────────────────

function isExemptRoute(appName, relativePath) {
  const basename = path.basename(relativePath);
  if (METADATA_EXEMPT.includes(basename)) return true;
  if (CLIENT_COMPONENT_EXEMPT.includes(basename)) return true;

  // Portal auth routes are intentionally private (noindex needed)
  if (appName === 'portal') {
    const normalized = '/' + relativePath.replace(/\/page\.tsx$/, '/').replace(/\\/g, '/');
    if (PORTAL_AUTH_ROUTES.includes(normalized)) return true;
    if (PORTAL_LAYOUT_INHERIT.includes(normalized)) return true;
  }

  // Blog page.tsx and [slug] inherit metadata from layout — only check if they override
  if (appName === 'blog' && (relativePath === 'page.tsx' || relativePath.startsWith('blog/'))) {
    return true;  // Inherits from blog/[locale]/layout.tsx
  }

  return false;
}

function checkGenerateMetadata(appName, appDir, filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const basename = path.basename(relativePath);

  if (isExemptRoute(appName, relativePath)) {
    pass(appName, relativePath, '⏭️ 跳过（豁免路径）');
    return;
  }

  // Look for generateMetadata
  if (!content.includes('generateMetadata')) {
    // Check if it's a route.ts (API route) — exempt
    if (basename.endsWith('route.ts')) return;
    fail(appName, relativePath, '缺少 generateMetadata() 导出 — 每个页面需要 SEO 元数据');
    return;  // No point checking alternates if metadata doesn't exist
  }

  pass(appName, relativePath, '✅ generateMetadata 存在');

  // Check for alternates with languages
  const metaStart = content.indexOf('generateMetadata');
  const metaBlock = content.substring(metaStart, Math.min(content.length, metaStart + 3000));

  if (!metaBlock.includes('alternates')) {
    fail(appName, relativePath, 'generateMetadata 中缺少 alternates 对象');
    return;
  }

  // Find alternates section
  const altIdx = metaBlock.indexOf('alternates:');
  if (altIdx >= 0) {
    const altBlock = metaBlock.substring(altIdx, Math.min(metaBlock.length, altIdx + 800));

    if (!altBlock.includes('languages')) {
      fail(appName, relativePath, 'alternates 中缺少 languages 属性');
    } else {
      pass(appName, relativePath, '✅ alternates.languages 存在');
    }

    if (!altBlock.includes('canonical')) {
      fail(appName, relativePath, 'alternates 中缺少 canonical');
    } else {
      pass(appName, relativePath, '✅ alternates.canonical 存在');
    }
  }
}

function checkMetaTitle(appName, appDir, filePath, relativePath) {
  if (isExemptRoute(appName, relativePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('generateMetadata')) return;

  // Scan the block containing generateMetadata for title:
  // It may appear as `title: t('...')` or `title: \`...\``
  // Simple check: does the file contain title: near generateMetadata?
  const genIdx = content.indexOf('generateMetadata');
  const afterGen = content.substring(genIdx, Math.min(content.length, genIdx + 4000));

  const hasTitle = /\btitle\b/.test(afterGen);
  if (!hasTitle) {
    fail(appName, relativePath, 'generateMetadata 返回值缺少 title 属性');
  } else {
    pass(appName, relativePath, '✅ generateMetadata 含 title');
  }
}

// ── Check 2: ban Object.fromEntries + locales.map pattern ─────────────

const FROM_ENTRIES_LOCALES_RE =
  /Object\.fromEntries\(\s*\n?\s*locales\.map\(\s*\(?\w\)?\s*=>\s*\[/;

function checkNoFromEntriesPattern(appName, appDir, filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (FROM_ENTRIES_LOCALES_RE.test(content)) {
    fail(appName, relativePath,
      '禁止使用 Object.fromEntries + locales.map 拼 languages — ' +
      '请使用 buildLanguages(locale, [...locales], path)');
  } else {
    pass(appName, relativePath, '✅ 未使用废弃的 fromEntries 模式');
  }
}

// ── Main ──────────────────────────────────────────────────────────────

function scanApp(app) {
  const appDir = path.join(repoRoot, app.dir);
  if (!fs.existsSync(appDir)) {
    console.log(`⚠️  目录不存在，跳过: ${app.dir}`);
    return;
  }

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const relativePath = path.relative(appDir, fullPath);
        checkGenerateMetadata(app.name, appDir, fullPath, relativePath);
        checkNoFromEntriesPattern(app.name, appDir, fullPath, relativePath);
        checkMetaTitle(app.name, appDir, fullPath, relativePath);
      }
    }
  }
  walk(appDir);
}

// ── CLI ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

for (const app of APPS) {
  console.log(`\n📁 ${app.name}/`);
  scanApp(app);
}

console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);

if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.join('\n'));
}

if (isCi && RESULTS.failed > 0) {
  console.error('\n❌ CI 模式：检查未通过');
  process.exit(1);
}

console.log('\n✅ check-seo-patterns.mjs 完成');
