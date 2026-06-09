#!/usr/bin/env node
/**
 * check-jsonld.mjs — JSON-LD 结构化数据检查
 *
 * 检查页面中的 JSON-LD schema 是否有效、必填字段是否完整。
 *
 * 用法：
 *   node packages/scripts/check-jsonld.mjs
 *   node packages/scripts/check-jsonld.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DIRS = ['apps/site/src'];

// 各 @type 的必填字段（Schema.org 标准）
const REQUIRED_FIELDS = {
  'Organization':       ['name'],
  'ProfessionalService': ['name'],
  'Service':            ['name'],
  'Product':            ['name'],
  'WebPage':            ['name'],
  'AboutPage':          ['name'],
  'CollectionPage':     ['name'],
  'Article':            ['headline', 'author'],
  'FAQPage':            ['mainEntity'],
  'BreadcrumbList':     ['itemListElement'],
  'HowTo':              ['name', 'step'],
  'HowToStep':          ['name'],
  'AggregateRating':    ['ratingValue', 'reviewCount'],
  'Review':             ['reviewRating'],
  'Rating':             ['ratingValue'],
  'Question':           ['name'],
  'Answer':             ['text'],
  'DefinedTerm':        ['name'],
  'DefinedTermSet':     ['name'],
  'Audience':           ['name'],
  'Place':              ['name'],
  'MonetaryAmount':     ['name'],
  'Person':              ['name'],
  'SpeakableSpecification': ['cssSelector'],
  'AggregateOffer':        ['lowPrice', 'priceCurrency'],
  'PostalAddress':         ['addressCountry'],
  'ContactPoint':          ['telephone'],
  'ListItem':              ['position', 'item'],
};


const RESULTS = { passed: 0, failed: 0, warnings: [] };

function fail(file, msg) {
  RESULTS.failed++;
  RESULTS.warnings.push(`  ❌ ${file}: ${msg}`);
}

function pass(file, msg) {
  RESULTS.passed++;
}

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

let totalChecked = 0;

for (const dir of DIRS) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) continue;

  for (const entry of walkSync(fullDir)) {
    if (!entry.endsWith('.tsx')) continue;

    const relativeFile = path.relative(repoRoot, entry);
    const content = fs.readFileSync(entry, 'utf-8');

    // Find all JSON-LD blocks: application/ld+json or jsonld variable assignments
    const jsonldBlocks = content.match(/['"]@type['"]\s*:\s*['"]([A-Z][a-zA-Z]+)['"]/g);  // only PascalCase literal types
    if (!jsonldBlocks) continue;

    totalChecked++;

    for (const block of jsonldBlocks) {
      const type = block.match(/:\s*['"]([^'"]+)['"]/)[1];  // capture value after colon
      const required = REQUIRED_FIELDS[type];
      if (!required) {
        fail(relativeFile, `未知的 @type: "${type}" — 请确认 Schema.org 标准类型`);
        continue;
      }

      // Check that each required field exists somewhere in the file
      for (const field of required) {
        // fields might be in different formats: field: value or "field": value
        const fieldPattern = new RegExp(`["']?${field}["']?\\s*:`);
        if (!fieldPattern.test(content)) {
          fail(relativeFile, `@type "${type}" 缺少必填字段 "${field}"`);
        } else {
          pass(relativeFile, `@type "${type}" 含 "${field}"`);
        }
      }
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

console.log(`📁 扫描 ${totalChecked} 个含 JSON-LD 的文件`);
console.log('='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);

if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.join('\n'));
}

if (isCi && RESULTS.failed > 0) {
  process.exit(1);
}

console.log('\n✅ check-jsonld.mjs 完成');
