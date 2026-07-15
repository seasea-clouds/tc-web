#!/usr/bin/env node
/**
 * check-colon-all.mjs — 全站点翻译冒号风格一致性检查
 *
 * 检查项目中所有语言翻译 JSON 文件的冒号使用是否一致。
 * 与 apps/portal 特有的 check-colon-consistency.mjs（仅 Check namespace）互补，
 * 本脚本扫描全部 namespace。
 *
 * 检查规则:
 *   1. 中文 (zh) — 正文文案使用半角冒号 : 应改为全角 ：
 *   2. 所有语言 — 同一值内混用全角 + 半角冒号
 *
 * 豁免：标准号/代码类 key（如 cccStandard_toy, labelRiskNote_nutrition 等）
 *
 * 用法:
 *   node packages/scripts/check-colon-all.mjs
 *   node packages/scripts/check-colon-all.mjs --ci
 *   node packages/scripts/check-colon-all.mjs --project=site
 *
 * 退出码: 0 通过, 1 失败
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function getDetectedProject() {
  const idx = process.argv.findIndex(a => a.startsWith('--project='));
  if (idx !== -1) return process.argv[idx].split('=')[1];
  const cwd = process.cwd();
  const m = cwd.match(/[/]apps[/]([^/]+)/);
  return m ? m[1] : 'site';
}

const detectedProject = getDetectedProject();
const isCi = process.argv.includes('--ci');

const MESSAGES_DIR = path.join(REPO_ROOT, 'apps', detectedProject, 'messages');

// ===== 豁免 key（标准号/代码引用，半角冒号合理） =====
const LEGACY_HALF_KEYS = new Set([
  'cccStandard_toy',
  'labelRiskNote_nutrition',
  'miit_order_32_2016',
  'catNmpa_sunscreen',
]);

// ===== 全角冒号优先的语言 =====
const FULLWIDTH_LANGS = new Set(['zh']);

// ===== 扫描 =====
function flattenValues(obj, prefix = '') {
  const results = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      results.push(...flattenValues(value, fullKey));
    } else if (typeof value === 'string') {
      results.push({ key: fullKey, value });
    }
  }
  return results;
}

function run() {
  let totalErrors = 0;

  console.log(`═══ 翻译冒号一致性检查 — ${detectedProject.toUpperCase()} ═══\n`);

  if (!fs.existsSync(MESSAGES_DIR)) {
    console.log(`  ∎ 无 messages 目录，跳过`);
    process.exit(0);
  }

  const files = fs.readdirSync(MESSAGES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log(`  ∎ 空 messages 目录，跳过`);
    process.exit(0);
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

    // 展平所有 key → value（全部 namespace）
    const entries = flattenValues(data);
    const isFullwidthLang = FULLWIDTH_LANGS.has(lang);

    for (const { key, value } of entries) {
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
        continue;
      }

      // === 检查2: 中文正文文案使用半角冒号 ===
      if (isFullwidthLang && hasHalf && !LEGACY_HALF_KEYS.has(key)) {
        console.log(`⚠️  [${lang}] 中文正文使用了半角冒号，应改为全角:`);
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
