#!/usr/bin/env node
/**
 * check-locale-prefix.mjs — CI-4: 路由 locale 前缀检测
 *
 * 检测 JSX/TSX 中 href 属性是否缺少 locale 前缀。
 *
 * 规则：
 *   1. href="/path" 但 path 不是外部 URL 或协议链接 → 可能缺少 locale
 *   2. 跳过外部链接 (http://, https://, mailto:, tel:, #, data:)
 *   3. 跳过已知合法的非 locale 路径（/api/, /_next/, 静态资源）
 *   4. 跳过已包含 locale 的动态路径（{locale}, `${locale}`）
 *   5. 只检查 portal 和 blog app（site 的链接不通过 href 使用）
 *
 * 用法：
 *   node packages/scripts/check-locale-prefix.mjs
 *   node packages/scripts/check-locale-prefix.mjs --ci   # 发现时 exit 1
 *   node packages/scripts/check-locale-prefix.mjs apps/portal/src  # 自定义目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DIRS_TO_CHECK = [
  'apps/site/src',
  'apps/portal/src',
  'apps/blog/src',
  'packages/ui/src',
];

// ─── 合法白名单 ──────────────────────────────────────────────────────────

// 已知不需要 locale 前缀的路径前缀
const SKIP_PATH_PREFIXES = [
  'http://', 'https://', 'mailto:', 'tel:', '#', 'data:',
  '/_next/', '/api/', '/images/', '/fonts/', '/icons/',
  '/favicon', '/manifest', '/robots.txt', '/sitemap', '/llms',
  '/search-index', '/blog/_next/', '/c/_next/',
];

// 已知合法的 href 值（不翻译/不需要 locale）
const LEGIT_HREFS = new Set([
  '#', '', '/', '..', '.', '../',
  '/en/', '/zh/', '/zh-cn/',
]);

// ─── 检测函数 ──────────────────────────────────────────────────────────

function isSkippableHref(href) {
  if (!href || href.length < 3) return true;
  if (LEGIT_HREFS.has(href)) return true;
  if (href.startsWith('{') || href.includes('${')) return true; // Dynamic
  if (href.startsWith('/') && SKIP_PATH_PREFIXES.some(p => href.startsWith(p))) return true;
  if (href.includes('.')) return true; // File extension
  return false;
}

/**
 * Check if an href value in JSX already handles locale properly
 */
function hasLocaleHandling(href) {
  if (!href) return true; // Skip null/undefined
  // Dynamic locale patterns
  if (href.includes('{locale}')) return true;
  if (href.includes('`/') && href.includes('${')) return true; // Template literal with locale
  if (href.includes('locale')) return true; // Uses locale variable
  if (href.includes('/{')) return true; // Next.js dynamic segment [locale]
  if (href.includes('/[')) return true; // Next.js dynamic segment pattern
  return false;
}

function isSkippableExpression(expr) {
  // Skip expressions that already handle locale
  if (expr.includes('locale') || expr.includes('localePath') ||
      expr.includes('pathWithLocale') || expr.includes('localizedHref') ||
      expr.includes('subsiteHref') || expr.includes('getHref')) return true;
  return false;
}

/**
 * Scan a TSX/TS file for missing locale prefix in href attributes
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip known translation call patterns (useRouter, usePathname, useLocale)
    if (line.includes('useTranslations') || line.includes('useLocale') ||
        line.includes('usePathname') || line.includes('import ')) continue;

    // Find href="..." patterns
    const hrefRe = /href=["']([^"']+)["']/g;
    let match;
    while ((match = hrefRe.exec(line)) !== null) {
      const href = match[1].trim();

      if (isSkippableHref(href)) continue;
      if (hasLocaleHandling(href)) continue;
      if (isSkippableExpression(href)) continue;

      // Must start with / to be a potential missing locale issue
      if (!href.startsWith('/')) continue;

      // Skip if it already has a locale prefix pattern (/{2}/ or known locale)
      if (/^\/(en|zh|zh-cn|ja|ko|fr|de|es|pt|ar|ru)\//.test(href)) continue;

      // This looks like a missing locale prefix
      issues.push({
        file: path.relative(repoRoot, filePath),
        line: lineNum,
        href: href,
        context: line.trim().substring(0, 120),
      });
    }

    // Find href={...} expression patterns with string literals
    const exprRe = /href=\{['"]([^'"]+)['"]\}/g;
    while ((match = exprRe.exec(line)) !== null) {
      const href = match[1].trim();

      if (isSkippableHref(href)) continue;
      if (hasLocaleHandling(href)) continue;
      if (!href.startsWith('/')) continue;
      if (/^\/(en|zh)\//.test(href)) continue;

      issues.push({
        file: path.relative(repoRoot, filePath),
        line: lineNum,
        href: href,
        context: line.trim().substring(0, 120),
      });
    }

    // Also detect href={`...`} template literal patterns WITHOUT locale
    const tmplRe = /href=\{`([^`]*)`\}/g;
    while ((match = tmplRe.exec(line)) !== null) {
      const tmpl = match[1];
      // Already has locale variable interpolation
      if (tmpl.includes('${locale') || tmpl.includes('${params?.locale') ||
          tmpl.includes('${params.locale')) continue;
      // Doesn't have any locale variable but has /path
      if (tmpl.startsWith('/') && !isSkippableHref(tmpl)) {
        issues.push({
          file: path.relative(repoRoot, filePath),
          line: lineNum,
          href: '`' + tmpl + '`',
          context: line.trim().substring(0, 120),
        });
      }
    }
  }

  return issues;
}

function walkSync(dir, maxDepth = 10) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'out') {
        results.push(...walkSync(fullPath, maxDepth - 1));
      } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

// ─── 主逻辑 ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const customDir = args.find(a => !a.startsWith('--'));

const dirs = customDir
  ? [customDir]
  : DIRS_TO_CHECK.map(d => path.join(repoRoot, d));

let totalIssues = 0;
const allIssues = [];

console.log('\n═══════════════════════════════════════════════');
console.log('  路由 locale 前缀检测 (CI-4)');
console.log('═══════════════════════════════════════════════\n');

for (const dir of dirs) {
  const rel = path.relative(repoRoot, dir);
  const files = walkSync(dir);

  for (const file of files) {
    const issues = scanFile(file);
    allIssues.push(...issues);
  }
}

if (allIssues.length === 0) {
  console.log('✅ 未发现缺少 locale 前缀的 href\n');
  process.exit(0);
}

// Group by file
const byFile = {};
for (const issue of allIssues) {
  if (!byFile[issue.file]) byFile[issue.file] = [];
  byFile[issue.file].push(issue);
}

for (const [file, issues] of Object.entries(byFile)) {
  console.log(`📄 ${file}:`);
  for (const issue of issues) {
    console.log(`  ❌ L${issue.line}: href="${issue.href}"`);
    console.log(`     ${issue.context}`);
  }
  console.log();
}

console.log('─────────────────────────────────────────────');
console.log(`❌ 共 ${allIssues.length} 个可能缺少 locale 前缀的链接`);
console.log('');
console.log('  修复建议:');
console.log('  1. 添加 locale 前缀，例如 href="/en/c/pricing"');
console.log('  2. 或使用动态 locale: href={`/${locale}/path`}');
console.log('  3. 如果是外部链接，以 http:// 开头则忽略');
console.log('─────────────────────────────────────────────\n');

if (isCi && allIssues.length > 0) {
  process.exit(1);
}
