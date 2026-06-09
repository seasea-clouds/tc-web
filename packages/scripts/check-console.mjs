#!/usr/bin/env node
/**
 * check-console.mjs — console.log/error/warn 残留检查
 *
 * 检测生产代码中遗留的 console 调用。
 * 允许测试文件和明确标记的忽略行。
 *
 * 用法：
 *   node packages/scripts/check-console.mjs
 *   node packages/scripts/check-console.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DIRS = ['apps/site/src', 'apps/blog/src', 'apps/portal/src', 'packages/ui/src'];

// Allow specific known-good locations for console
const ALLOWED_FILES = [
  'i18n/request.ts',        // Error logging fallback
  'check-hardcoded.mjs',    // This is a CLI tool, not production code
  'check-translations.mjs', // CLI tool
  'build-',                 // Build scripts
  'convert-webp.mjs',       // Build script
  'clean-rsc.js',           // Build script
  'check-client.tsx',       // Portal dev-mode console.warn (D1/PDF/email, intentionally marked)
  'report/page.tsx',        // Portal report rebuild error handler
];

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(file, line, code) {
  RESULTS.failed++;
  RESULTS.warnings.push(`  ❌ ${file}:${line} — ${code.trim().slice(0, 80)}`);
}

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

let totalChecked = 0;

for (const dir of DIRS) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) continue;

  for (const entry of walkSync(fullDir)) {
    if (!entry.endsWith('.tsx') && !entry.endsWith('.ts')) continue;
    if (entry.endsWith('.test.tsx') || entry.endsWith('.test.ts') || entry.endsWith('.spec.ts')) continue;
    if (entry.endsWith('.d.ts')) continue;

    const relativeFile = path.relative(repoRoot, entry);
    const isAllowed = ALLOWED_FILES.some(a => relativeFile.includes(a));
    if (isAllowed) {
      RESULTS.passed++;
      continue;
    }

    const content = fs.readFileSync(entry, 'utf-8');
    const lines = content.split('\n');
    let fileHasIssue = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

      // Match console.log, console.error, console.warn, console.debug
      const match = trimmed.match(/console\.(log|error|warn|debug)\s*\(/);
      if (match) {
        // Skip if line has eslint disable
        if (line.includes('eslint-disable') || line.includes('// console')) continue;
        fail(relativeFile, i + 1, trimmed);
        fileHasIssue = true;
      }
    }

    if (!fileHasIssue) {
      RESULTS.passed++;
    }
    totalChecked++;
  }
}

function walkSync(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...walkSync(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log(`📁 扫描 ${totalChecked} 个文件`);
console.log('='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);

if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.join('\n'));
}

if (isCi && RESULTS.failed > 0) {
  process.exit(1);
}

console.log('\n✅ check-console.mjs 完成');
