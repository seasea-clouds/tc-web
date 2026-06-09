#!/usr/bin/env node
/**
 * check-map-key.mjs — JSX .map() 缺少 key 属性检查
 *
 * 检测 JSX/TSX 中 Array.map() 返回 JSX 时缺少 key prop。
 *
 * 用法：
 *   node packages/scripts/check-map-key.mjs
 *   node packages/scripts/check-map-key.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DIRS = ['apps/site/src', 'apps/blog/src', 'apps/portal/src', 'packages/ui/src'];

const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(file, line, snippet) {
  RESULTS.failed++;
  RESULTS.warnings.push(`  ❌ ${file}:${line} — ${snippet.slice(0, 80)}`);
}

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

let totalChecked = 0;

for (const dir of DIRS) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) continue;

  for (const entry of walkSync(fullDir)) {
    if (!entry.endsWith('.tsx')) continue;
    if (entry.endsWith('.test.tsx') || entry.endsWith('.spec.tsx')) continue;

    const relativeFile = path.relative(repoRoot, entry);
    const content = fs.readFileSync(entry, 'utf-8');
    const lines = content.split('\n');

    let fileHasIssue = false;
    let inMapBlock = false;
    let mapDepth = 0;
    let mapLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect .map(( => pattern
      const mapMatch = line.match(/\.map\s*\(/);
      if (mapMatch) {
        inMapBlock = true;
        mapDepth = 1;
        mapLine = i + 1;
      }

      if (inMapBlock) {
        // Count braces to track nesting
        for (const ch of line) {
          if (ch === '(' || ch === '{') mapDepth++;
          if (ch === ')' || ch === '}') mapDepth--;
        }

        // When we're back at depth 0 (or negative), map has ended
        if (mapDepth <= 0) {
          const blockLines = lines.slice(mapLine - 1, i + 1).join('\n');
          
          // Skip: maps returning plain objects (not JSX) — no `<tag>` in return
          // Skip: maps in generateStaticParams — always plain objects
          // Skip: maps as prop values (rows={...} or data=...)
          if (blockLines.includes('=>') && !blockLines.includes('key=') && blockLines.includes('<') && !blockLines.includes('({') && !blockLines.includes('return {') && !blockLines.includes('rows={') && !blockLines.includes('.slice(')) {
            fail(relativeFile, mapLine, blockLines.trim().slice(0, 80));
            fileHasIssue = true;
          }
          inMapBlock = false;
        }
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

console.log(`📁 扫描 ${totalChecked} 个 TSX 文件`);
console.log('='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);

if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.join('\n'));
}

if (isCi && RESULTS.failed > 0) {
  process.exit(1);
}

console.log('\n✅ check-map-key.mjs 完成');
