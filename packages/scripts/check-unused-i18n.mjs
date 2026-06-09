#!/usr/bin/env node
/**
 * check-unused-i18n.mjs — 未使用翻译 key 检测
 *
 * 扫描源码中 t() 调用和 getTranslations namespace，与翻译文件对比，
 * 找出未被引用的 key。
 *
 * 用法：
 *   node packages/scripts/check-unused-i18n.mjs
 *   node packages/scripts/check-unused-i18n.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const SRC_DIRS = ['apps/site/src', 'apps/blog/src', 'apps/portal/src', 'packages/ui/src'];
const MESSAGES_FILE = path.join(repoRoot, 'apps/site/messages/en.json');

// Files to skip (build tools, scripts, etc.)
const SKIP_FILES = [
  'check-hardcoded.mjs',
  'check-translations.mjs',
  'clean-rsc.js',
  'convert-webp.mjs',
  'build-',
  'i18n/request.ts',
  'i18n/messages.ts',
];

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(msg) {
  RESULTS.failed++;
  RESULTS.warnings.push(`  ⚠️  ${msg}`);
}

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

// Load en.json
const enMessages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));

// Build all possible en keys
const allEnKeys = new Set();
for (const [ns, vals] of Object.entries(enMessages)) {
  if (typeof vals === 'object' && vals !== null) {
    for (const key of Object.keys(vals)) {
      allEnKeys.add({ ns, key, full: `${ns}.${key}` });
    }
  }
}

// Collect all t() calls from source with namespace context
const usedKeys = new Set(); // Set of 'Namespace.key'
const fileRefs = {}; // fullKey -> [file1, file2]

for (const dir of SRC_DIRS) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) continue;

  for (const entry of walkSync(fullDir)) {
    if (!entry.endsWith('.tsx') && !entry.endsWith('.ts')) continue;
    if (SKIP_FILES.some(s => entry.includes(s))) continue;

    const content = fs.readFileSync(entry, 'utf-8');
    const relativeFile = path.relative(repoRoot, entry);

    // Find namespace from getTranslations or useTranslations
    const nsMatch = content.match(/[gs]etTranslations\s*\(\s*\{[^}]*namespace\s*:\s*['"]([^'"]+)['"]/);
    const ns = nsMatch ? nsMatch[1] : null;

    // Find useTranslations() or getTranslations() without explicit namespace
    const implicitNs = content.match(/useTranslations\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    const actualNs = ns || (implicitNs ? implicitNs[1] : null);

    if (!actualNs) {
      // Check for useT() pattern (custom hook)
      if (content.includes('useT(') || content.includes('useT ()')) continue;
      continue;
    }

    // Find all t('key') or t("key") calls
    const tCalls = content.matchAll(/[^a-zA-Z]t\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    for (const match of tCalls) {
      const key = match[1];
      const fullKey = `${actualNs}.${key}`;

      if (allEnKeys.has({ ns: actualNs, key, full: fullKey })) {
        usedKeys.add(fullKey);
        if (!fileRefs[fullKey]) fileRefs[fullKey] = [];
        fileRefs[fullKey].push(relativeFile);
      } else {
        // Key not found in en.json — might be from shared ui messages
        // Don't flag as error but note it
      }
    }
  }
}

// Find unused keys
let unusedCount = 0;
for (const { ns, key, full } of allEnKeys) {
  if (!usedKeys.has(full)) {
    // Double-check: look for namespace.key pattern in all source files
    let foundAnywhere = false;
    for (const dir of SRC_DIRS) {
      const fullDir = path.join(repoRoot, dir);
      if (!fs.existsSync(fullDir)) continue;
      for (const entry of walkSync(fullDir)) {
        if (!entry.endsWith('.tsx') && !entry.endsWith('.ts')) continue;
        const content = fs.readFileSync(entry, 'utf-8');
        // Check for t('key') within rendered content or data
        if (content.includes(`'${key}'`)) {
          foundAnywhere = true;
          break;
        }
      }
      if (foundAnywhere) break;
    }
    if (!foundAnywhere) {
      unusedCount++;
      fail(`${full} (可能未使用)`);
    }
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

console.log(`📁 en.json 共有 ${allEnKeys.size} 个 key`);
console.log(`📝 源码中引用了 ${usedKeys.size} 个 key`);
console.log('='.repeat(50));
console.log(`📊 结果: ${unusedCount === 0 ? '✅ 全部已使用' : `⚠️  ${unusedCount} 个可能未使用`}`);

if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.join('\n'));
}

if (isCi && RESULTS.failed > 0) {
  process.exit(0);  // Warning only, don't block build
}

console.log('\n✅ check-unused-i18n.mjs 完成');
