#!/usr/bin/env node
/**
 * check-breadcrumb-keys.mjs — 面包屑 i18n key 完整性检查
 *
 * 从 AutoBreadcrumb.tsx 提取所有映射表（SEGMENT_LABELS / SERVICE_SEGMENT_LABELS /
 * CHECK_SEGMENT_LABELS / INDUSTRY_LABELS），验证每个 key 在 48 语言中均存在。
 *
 * 同时检测硬编码英文 fallback 值（key 名 = 值，或英文兜底）。
 *
 * 用法：
 *   node check-breadcrumb-keys.mjs                  # 报告模式
 *   node check-breadcrumb-keys.mjs --ci             # CI 阻塞模式
 *   node check-breadcrumb-keys.mjs --report         # 仅输出报告（不阻塞）
 *
 * 作为独立脚本也可由 ci-check.mjs 调用。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__dirname, '..');
const AUTO_BREADCRUMB_PATH = path.join(MONOREPO_ROOT, 'ui', 'src', 'AutoBreadcrumb.tsx');
const SHARED_UI_MESSAGES_DIR = path.join(MONOREPO_ROOT, 'ui', 'messages');
const SITE_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'site', 'messages');
const PORTAL_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'portal', 'messages');

// ============================================================
// 工具函数
// ============================================================
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v, p));
    } else {
      result[p] = v;
    }
  }
  return result;
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (key in result && typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
        && typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

function loadAllMessages() {
  const base = {};
  // Load shared UI
  if (fs.existsSync(SHARED_UI_MESSAGES_DIR)) {
    for (const file of fs.readdirSync(SHARED_UI_MESSAGES_DIR)) {
      if (!file.endsWith('.json')) continue;
      const locale = file.slice(0, -5);
      base[locale] = JSON.parse(fs.readFileSync(path.join(SHARED_UI_MESSAGES_DIR, file), 'utf-8'));
    }
  }
  // Merge site
  if (fs.existsSync(SITE_MESSAGES_DIR)) {
    for (const file of fs.readdirSync(SITE_MESSAGES_DIR)) {
      if (!file.endsWith('.json')) continue;
      const locale = file.slice(0, -5);
      const data = loadJSON(path.join(SITE_MESSAGES_DIR, file));
      if (data && base[locale]) base[locale] = deepMerge(base[locale], data);
    }
  }
  // Merge portal
  if (fs.existsSync(PORTAL_MESSAGES_DIR)) {
    for (const file of fs.readdirSync(PORTAL_MESSAGES_DIR)) {
      if (!file.endsWith('.json')) continue;
      const locale = file.slice(0, -5);
      const data = loadJSON(path.join(PORTAL_MESSAGES_DIR, file));
      if (data && base[locale]) base[locale] = deepMerge(base[locale], data);
    }
  }
  return base;
}

// ============================================================
// 从 AutoBreadcrumb.tsx 提取映射
// ============================================================
function extractBreadcrumbMappings() {
  if (!fs.existsSync(AUTO_BREADCRUMB_PATH)) {
    console.log('⚠️  找不到 AutoBreadcrumb.tsx:', AUTO_BREADCRUMB_PATH);
    return [];
  }
  const content = fs.readFileSync(AUTO_BREADCRUMB_PATH, 'utf-8');
  const mappings = [];

  for (const varName of ['SEGMENT_LABELS', 'SERVICE_SEGMENT_LABELS', 'CHECK_SEGMENT_LABELS', 'INDUSTRY_LABELS']) {
    const idx = content.indexOf('const ' + varName + ':');
    if (idx < 0) continue;
    const eqIdx = content.indexOf('=', idx);
    const braceStart = content.indexOf('{', eqIdx);
    let depth = 0;
    let blockEnd = braceStart;
    for (let i = braceStart; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') depth--;
      if (depth === 0) { blockEnd = i; break; }
    }
    const block = content.substring(braceStart + 1, blockEnd);

    // Match both 'key': 'value' and "key": "value"
    const entryRe = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]*)['"]/g;
    let m;
    while ((m = entryRe.exec(block)) !== null) {
      mappings.push({ key: m[1], namespaceKey: m[2], source: varName });
    }
  }
  return mappings;
}

function getBreadcrumbNamespace(source) {
  return source === 'CHECK_SEGMENT_LABELS' ? 'Check' : 'Navbar';
}

// ============================================================
// 检查
// ============================================================
function resolveNested(messages, locale, namespace, keyPath) {
  const parts = keyPath.split('.');
  let current = messages[locale];
  if (!current || typeof current !== 'object') return null;
  if (!(namespace in current)) return null;
  current = current[namespace];
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return null;
    current = current[part];
  }
  return typeof current === 'string' ? current : null;
}

function checkHardcodedValues(mappings, allMessages) {
  /**
   * 检测硬编码英文 fallback：
   * 1. key 名 = 值（大小写不敏感）
   * 2. 纯英文单词且未翻译（如 "Privacy Policy" 在所有语言中相同）
   */
  const issues = [];
  const seen = new Set();

  for (const mapping of mappings) {
    const ns = getBreadcrumbNamespace(mapping.source);
    const fullKey = `${ns}.${mapping.namespaceKey}`;
    if (seen.has(fullKey)) continue;
    seen.add(fullKey);

    // Check English source
    const enMsg = allMessages['en'];
    if (!enMsg || !enMsg[ns]) continue;
    const enVal = resolveNested(allMessages, 'en', ns, mapping.namespaceKey);
    if (!enVal) continue;

    // Check all other languages
    for (const [locale, msgs] of Object.entries(allMessages)) {
      if (locale === 'en') continue;
      const val = resolveNested(allMessages, locale, ns, mapping.namespaceKey);
      if (!val) {
        issues.push({ locale, key: fullKey, type: 'missing_key', value: '(key 不存在)' });
        continue;
      }
      if (val === enVal) {
        // English fallback
        const shortKey = mapping.namespaceKey.split('.').pop();
        // Skip if value looks like a key name (e.g. "signOut" = "signOut")
        const isKeyAsValue = val.toLowerCase() === shortKey.toLowerCase();
        // Skip if value is a common English word that's acceptable as-is
        const COMMON_ENGLISH = new Set(['Home', 'About', 'Services', 'Packages', 'FAQ', 'Blog', 'Contact', 'WhatsApp', 'Search', 'Industries', 'Sign In', 'Sign Up', 'Get a Quote', 'Free Check', 'Insights', 'Contact Us']);
        if (COMMON_ENGLISH.has(val)) continue;
        // Skip if value is a known brand/acronym
        if (/^[A-Z]{2,}$/.test(val)) continue;
        // Skip common UI terms that are widely used as-is
        const COMMON_UI_TERMS = new Set(['Home', 'About', 'Services', 'Packages', 'FAQ', 'Blog', 'Contact', 'WhatsApp', 'Search', 'Industries', 'Sign In', 'Sign Up', 'Get a Quote', 'Free Check', 'Insights', 'Contact Us', 'Sign Out', 'My Reports', 'Settings', 'Subscription', 'Pricing', 'Dashboard', 'Billing', 'Login', 'Register', 'Report']);
        if (COMMON_UI_TERMS.has(val)) continue;

        issues.push({ locale, key: fullKey, type: 'english_fallback', value: val, isKeyAsValue });
      }
    }
  }
  return issues;
}

// ============================================================
// Main
// ============================================================
const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const isReport = args.includes('--report');

const mappings = extractBreadcrumbMappings();
if (mappings.length === 0) {
  console.log('⚠️  未找到面包屑映射（AutoBreadcrumb.tsx 不存在或无映射表）');
  process.exit(0);
}

const allMessages = loadAllMessages();
const locales = Object.keys(allMessages).sort();

console.log(`🧩 面包屑 key 完整性检查`);
console.log(`   映射数: ${mappings.length}`);
console.log(`   语言数: ${locales.length}`);
console.log(`   来源: ${AUTO_BREADCRUMB_PATH}`);
console.log('');

// 1. Key 完整性
const missingKeys = [];
for (const mapping of mappings) {
  const ns = getBreadcrumbNamespace(mapping.source);
  for (const locale of locales) {
    const value = resolveNested(allMessages, locale, ns, mapping.namespaceKey);
    if (!value) {
      missingKeys.push({ locale, key: mapping.key, ns, keyPath: mapping.namespaceKey, source: mapping.source });
    }
  }
}

// 2. 硬编码英文检测
const hardcodedIssues = checkHardcodedValues(mappings, allMessages);

// 汇总
const totalMissing = missingKeys.length;
const totalHardcoded = hardcodedIssues.length;

// 报告
if (totalMissing > 0) {
  console.log(`❌ 缺失 key: ${totalMissing} 处`);
  for (const m of missingKeys.slice(0, 50)) {
    console.log(`  [${m.locale}] ${m.source}.${m.key} → ${m.ns}.${m.keyPath}`);
  }
  if (missingKeys.length > 50) console.log(`  ... 还有 ${missingKeys.length - 50} 条`);
}

if (totalHardcoded > 0) {
  console.log(`\n⚠️  硬编码英文 fallback: ${totalHardcoded} 处`);
  // 按 key 分组去重
  const byKey = {};
  for (const h of hardcodedIssues) {
    if (!byKey[h.key]) byKey[h.key] = { type: h.type, value: h.value, isKeyAsValue: h.isKeyAsValue, locales: [] };
    byKey[h.key].locales.push(h.locale);
  }
  for (const [key, info] of Object.entries(byKey)) {
    const flag = info.isKeyAsValue ? '🔴 KEY_AS_VALUE' : '🟡 ENGLISH_FALLBACK';
    const count = info.locales.length;
    console.log(`  ${flag} ${key} → "${info.value}" (${count} 语言)`);
  }
}

if (totalMissing === 0 && totalHardcoded === 0) {
  console.log('✅ 所有面包屑 key 完整，无硬编码英文');
}

const totalIssues = totalMissing + totalHardcoded;

if (isReport) {
  // 仅输出 JSON 报告
  console.log(`\n${JSON.stringify({ mappings: mappings.length, missingKeys: totalMissing, hardcodedFallbacks: totalHardcoded, missing: missingKeys, hardcoded: hardcodedIssues }, null, 2)}`);
  process.exit(0);
}

if (totalIssues > 0) {
  console.log(`\n⚠️  共 ${totalIssues} 个问题`);
  if (isCi) process.exit(1);
} else {
  console.log('\n✅ 全部通过');
}
