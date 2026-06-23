#!/usr/bin/env node
/**
 * 将 translate-tool 翻译结果写回 Portal 消息文件
 *
 * 用法:
 *   node packages/scripts/apply-portal-translations.mjs
 *     (从 /tmp/portal_translate_results.json 读取翻译结果，写回 apps/portal/messages/)
 *
 *   或:
 *   node packages/scripts/apply-portal-translations.mjs -i /path/to/results.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..');
const PORTAL_MESSAGES_DIR = path.join(MONOREPO_ROOT, 'apps', 'portal', 'messages');

// 解析命令行参数
const args = process.argv.slice(2);
const resultsFile = args.includes('-i')
  ? args[args.indexOf('-i') + 1]
  : '/tmp/portal_translate_results.json';

console.log(`📂 读取翻译结果: ${resultsFile}`);

// --- 辅助函数 ---

/** 获取嵌套对象中的值，返回 {ok, value} */
function getNested(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return { ok: false };
    if (!(part in current)) return { ok: false };
    current = current[part];
  }
  return { ok: true, value: current };
}

/** 设置嵌套对象中的值 */
function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/** 读取 JSON 文件 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// --- 读取翻译结果 ---

const raw = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

// 支持两种格式:
// 格式1: translate-tool 输出 {results: {af: {key: text, ...}, ...}}
// 格式2: 标准 [{key, translations: {af: "...", ...}}]
let byLocale; // {locale: {key: translatedText, ...}}

if (raw.results && typeof raw.results === 'object' && !Array.isArray(raw.results)) {
  console.log('📦 识别为 translate-tool 格式（按 locale 分组）');
  byLocale = raw.results;
} else if (Array.isArray(raw)) {
  console.log(`📦 识别为标准数组格式，共 ${raw.length} 个 key`);
  byLocale = {};
  // 先反转格式: 从 [{key, translations: {af: "...", ...}}] 转为 {af: {key: "...", ...}}
  for (const item of raw) {
    if (!item.translations) continue;
    for (const [locale, translatedText] of Object.entries(item.translations)) {
      if (locale === 'en') continue;
      if (!byLocale[locale]) byLocale[locale] = {};
      byLocale[locale][item.key] = translatedText;
    }
  }
} else {
  console.error('❌ 结果文件格式无法识别');
  process.exit(1);
}

// --- 读取英文源文件 ---

const enFilePath = path.join(PORTAL_MESSAGES_DIR, 'en.json');
const enData = readJson(enFilePath);

// --- 逐一应用翻译 ---

let totalUpdated = 0;
let totalFiles = 0;

for (const [locale, keys] of Object.entries(byLocale)) {
  if (Object.keys(keys).length === 0) continue;

  const filePath = path.join(PORTAL_MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ ${locale}.json 不存在，跳过`);
    continue;
  }

  const data = readJson(filePath);
  let fileUpdated = 0;

  for (const [key, translatedText] of Object.entries(keys)) {
    if (!translatedText || translatedText.trim() === '') continue;

    // 获取当前 locale 的旧值
    const { ok: hasOld, value: oldValue } = getNested(data, key);
    if (!hasOld) continue;

    // 获取英文源值
    const { ok: hasEn, value: enValue } = getNested(enData, key);
    if (!hasEn) continue;

    // 仅当旧值等于英文源值时才替换（只替换 fallback 项，不覆盖已有翻译）
    if (oldValue === enValue) {
      setNested(data, key, translatedText);
      fileUpdated++;
    }
  }

  if (fileUpdated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    totalFiles++;
    totalUpdated += fileUpdated;
    console.log(`  ✅ ${locale}: ${fileUpdated} 处更新`);
  } else {
    console.log(`  ➖ ${locale}: 无需更新`);
  }
}

console.log(`\n📊 总计: ${totalFiles} 个文件, ${totalUpdated} 处翻译已应用`);
console.log('✅ 完成！');
