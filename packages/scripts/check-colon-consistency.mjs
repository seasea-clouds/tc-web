#!/usr/bin/env node
/**
 * check-colon-consistency.mjs — 翻译文件冒号风格一致性检查
 *
 * 检查所有 48 种语言的翻译 JSON 文件中 Check 命名空间的冒号使用是否一致。
 * 主要检查：
 *   1. 中文 (zh) — 正文文案中混入半角冒号 : 应改为全角 ：
 *   2. 所有语言 — 同一值内混用全角 + 半角冒号
 *
 * 允许豁免的标准号/代码类 key ：
 *   cccStandard_toy, labelRiskNote_nutrition, miit_order_32_2016, catNmpa_sunscreen
 *   (这些包含 GB 标准号、HS 代码等，半角冒号合理)
 *
 * 用法：
 *   node check-colon-consistency.mjs [--ci]
 *
 * 退出码: 0 通过, 1 失败
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const MESSAGES_DIR = path.join(REPO_ROOT, 'apps/portal/messages');
const isCi = process.argv.includes('--ci');

// ===== 豁免列表（标准号/代码引用，半角冒号合理） =====
const LEGACY_HALF_KEYS = new Set([
  'cccStandard_toy',
  'labelRiskNote_nutrition',
  'miit_order_32_2016',
  'catNmpa_sunscreen',
]);

// ===== 全角冒号优先的语言（CJK） =====
// 这些语言在 UI 排版中预期使用全角冒号
const FULLWIDTH_LANGS = new Set(['zh']);

let totalErrors = 0;

// ===== 扫描入口 =====
function run() {
  console.log('═══ 翻译冒号一致性检查 ═══\n');

  if (!fs.existsSync(MESSAGES_DIR)) {
    console.error(`❌ messages 目录不存在: ${MESSAGES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MESSAGES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error('❌ 未找到翻译文件');
    process.exit(1);
  }

  console.log(`扫描 ${files.length} 个语言文件...\n`);

  for (const file of files) {
    const lang = file.replace('.json', '');
    const filePath = path.join(MESSAGES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    let data;

    try {
      data = JSON.parse(content);
    } catch {
      console.error(`❌ [${lang}] JSON 解析失败: ${file}`);
      totalErrors++;
      continue;
    }

    const checkNamespace = data?.Check;
    if (!checkNamespace || typeof checkNamespace !== 'object') continue;

    const isFullwidthLang = FULLWIDTH_LANGS.has(lang);

    for (const [key, value] of Object.entries(checkNamespace)) {
      if (typeof value !== 'string') continue;

      const hasHalf = value.includes(':') && !value.includes('\uff1a');
      const hasFull = value.includes('\uff1a');
      const mixedInValue = value.includes(':') && value.includes('\uff1a');

      // === 检查1: 同一值内混用全角 + 半角 ===
      if (mixedInValue) {
        console.log(`❌ [${lang}] 同一值混用全半角冒号:`);
        console.log(`   文件: ${file}`);
        console.log(`   key:  ${key}`);
        console.log(`   值:   ${value}\n`);
        totalErrors++;
        continue; // 不重复报
      }

      // === 检查2: 中文正文文案使用半角冒号 ===
      if (isFullwidthLang && hasHalf && !LEGACY_HALF_KEYS.has(key)) {
        console.log(`⚠️  [${lang}] 正文文案使用了半角冒号，应改为全角:`);
        console.log(`   文件: ${file}`);
        console.log(`   key:  ${key}`);
        console.log(`   值:   ${value}\n`);
        totalErrors++;
      }
    }
  }

  // ===== 总结 =====
  console.log('─────────────────────────────');
  if (totalErrors > 0) {
    console.log(`❌ 发现 ${totalErrors} 个冒号风格问题`);
    if (isCi) process.exit(1);
  } else {
    console.log('✅ 所有语言冒号风格一致，无问题');
  }
  console.log();
}

run();
