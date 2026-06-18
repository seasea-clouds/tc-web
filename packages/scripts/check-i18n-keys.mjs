#!/usr/bin/env node
/**
 * check-i18n-keys.mjs — 通用 i18n key 完整性检查
 *
 * 检查三个站点（site / portal / ui）的所有 i18n key 是否在 48 语言文件中完整存在。
 * 同时检测硬编码英文 fallback 值。
 *
 * 用法：
 *   node check-i18n-keys.mjs                  # 报告模式
 *   node check-i18n-keys.mjs --ci             # CI 阻塞模式
 *   node check-i18n-keys.mjs --report         # 仅输出 JSON 报告
 *   node check-i18n-keys.mjs --missing-only   # 仅输出缺失 key 列表（用于翻译）
 *   node check-i18n-keys.mjs --generate-input # 生成 translate-tool 输入文件
 *
 * 作为独立脚本也可由 ci-check.mjs 调用。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__dirname, '..');
const SITE_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'site', 'messages');
const PORTAL_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'portal', 'messages');
const UI_MESSAGES_DIR = path.join(MONOREPO_ROOT, 'ui', 'messages');

// 48 种语言（en 为源语言，不参与检查）
const LOCALES = [
  'af','ar','az','be','bg','bn','ca','cs','da','de','el','es','fa','fi','fr',
  'he','hi','hr','hu','hy','id','it','ja','ka','ko','ms','ne','nl','no','pl',
  'pt','ro','ru','si','sk','sl','sq','sr','sv','sw','ta','th','tr','uk','ur','vi','zh'
];

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

// ============================================================
// 加载各站点消息
// ============================================================
function loadProjectMessages(projectName) {
  const dir = projectName === 'site' ? SITE_MESSAGES_DIR
    : projectName === 'portal' ? PORTAL_MESSAGES_DIR
    : UI_MESSAGES_DIR;
  if (!fs.existsSync(dir)) return { en: {}, locales: [] };
  const enRaw = loadJSON(path.join(dir, 'en.json'));
  if (!enRaw) return { en: {}, locales: [] };
  const en = flattenKeys(enRaw);

  const locales = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    if (projectName === 'portal' && file.startsWith('_')) continue;
    const locale = file.slice(0, -5);
    if (locale === 'en') continue;
    locales.push(locale);
  }

  return { en, locales: locales.sort() };
}

// ============================================================
// 检查 key 完整性
// ============================================================
function checkKeyCompleteness(projectName, projectData) {
  const { en, locales } = projectData;
  const missing = [];
  const extra = [];

  for (const lang of locales) {
    const langPath = path.join(
      projectName === 'site' ? SITE_MESSAGES_DIR :
      projectName === 'portal' ? PORTAL_MESSAGES_DIR :
      UI_MESSAGES_DIR,
      `${lang}.json`
    );
    const langFlat = loadJSON(langPath);
    if (!langFlat) {
      for (const key of Object.keys(en)) {
        missing.push({ locale: lang, key });
      }
      continue;
    }
    const langFlattened = flattenKeys(langFlat);

    for (const key of Object.keys(en)) {
      if (!(key in langFlattened)) {
        missing.push({ locale: lang, key });
      }
    }

    for (const key of Object.keys(langFlattened)) {
      if (!(key in en)) {
        extra.push({ locale: lang, key, value: langFlattened[key] });
      }
    }
  }

  return { missing, extra };
}

// ============================================================
// 检测硬编码英文 fallback
// ============================================================
const IGNORE_FALLBACK_VALUES = new Set([
  'NMPA Cosmetics Filing', 'NMPA cosmetics filing and registration support',
  'PIPL Data Compliance Assessment', 'GACC Food Registration',
  'China Import Compliance Services', 'Medical device compliance training and advisory',
  'Baby & Maternal', 'Free Check', 'FAQ', 'WhatsApp',
  'Sign Out', 'My Reports', 'Settings', 'Subscription',
  'Pricing', 'Dashboard', 'Billing', 'Login', 'Register', 'Report',
  'Home', 'About', 'Services', 'Packages', 'Blog', 'Contact',
  'WhatsApp', 'Search', 'Industries', 'Sign In', 'Sign Up',
  'Get a Quote', 'Free Check', 'Insights', 'Contact Us',
]);

function checkHardcodedFallbacks(projectName, projectData) {
  const { en, locales } = projectData;
  const issues = [];

  for (const lang of locales) {
    const langPath = path.join(
      projectName === 'site' ? SITE_MESSAGES_DIR :
      projectName === 'portal' ? PORTAL_MESSAGES_DIR :
      UI_MESSAGES_DIR,
      `${lang}.json`
    );
    const langFlat = loadJSON(langPath);
    if (!langFlat) continue;
    const langFlattened = flattenKeys(langFlat);

    for (const [key, enVal] of Object.entries(en)) {
      if (typeof enVal !== 'string' || enVal.length <= 2) continue;
      const langVal = langFlattened[key] ?? '';

      if (langVal === enVal && !IGNORE_FALLBACK_VALUES.has(enVal)) {
        const shortKey = key.split('.').pop() || key;
        const isKeyAsValue = enVal.toLowerCase() === shortKey.toLowerCase();
        issues.push({ locale: lang, key, value: enVal, isKeyAsValue });
      }
    }
  }

  return issues;
}

// ============================================================
// 生成 translate-tool 输入文件
// ============================================================
function generateTranslateInput(missingByProject) {
  const outputFile = '/tmp/i18n_missing_keys.json';
  const output = [];
  for (const [project, data] of Object.entries(missingByProject)) {
    for (const m of data.missing) {
      output.push({ project, locale: m.locale, key: m.key });
    }
  }
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  return outputFile;
}

// ============================================================
// Main
// ============================================================
const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const missingOnly = args.includes('--missing-only');
const generateInput = args.includes('--generate-input');

// 加载各站点
const siteData = loadProjectMessages('site');
const portalData = loadProjectMessages('portal');
const uiData = loadProjectMessages('ui');

// 检查 key 完整性
const siteResult = checkKeyCompleteness('site', siteData);
const portalResult = checkKeyCompleteness('portal', portalData);
const uiResult = checkKeyCompleteness('ui', uiData);

const missingByProject = { site: siteResult, portal: portalResult, ui: uiResult };

// 检查硬编码 fallback
const siteHardcoded = checkHardcodedFallbacks('site', siteData);
const portalHardcoded = checkHardcodedFallbacks('portal', portalData);
const uiHardcoded = checkHardcodedFallbacks('ui', uiData);

if (generateInput) {
  const outputFile = generateTranslateInput(missingByProject);
  console.log(`✅ 缺失 key 清单已生成: ${outputFile}`);
  console.log(`   共 ${JSON.parse(fs.readFileSync(outputFile, 'utf-8')).length} 条`);
  process.exit(0);
}

if (missingOnly) {
  const result = {
    site: { missing: siteResult.missing.length, keys: siteResult.missing },
    portal: { missing: portalResult.missing.length, keys: portalResult.missing },
    ui: { missing: uiResult.missing.length, keys: uiResult.missing },
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// ============================================================
// 报告
// ============================================================
const projects = [
  { name: 'site', missing: siteResult.missing, extra: siteResult.extra, hardcoded: siteHardcoded },
  { name: 'portal', missing: portalResult.missing, extra: portalResult.extra, hardcoded: portalHardcoded },
  { name: 'ui', missing: uiResult.missing, extra: uiResult.extra, hardcoded: uiHardcoded },
];

console.log('🔑 i18n key 完整性检查');
console.log('');

let totalMissing = 0;
let totalExtra = 0;
let totalHardcoded = 0;

for (const proj of projects) {
  const missingCount = proj.missing.length;
  const extraCount = proj.extra.length;
  const hardcodedCount = proj.hardcoded.length;
  totalMissing += missingCount;
  totalExtra += extraCount;
  totalHardcoded += hardcodedCount;

  console.log(`📦 ${proj.name.toUpperCase()} (${proj.missing.length} missing, ${proj.extra.length} extra, ${proj.hardcoded.length} hardcoded):`);

  if (missingCount > 0) {
    const byKey = {};
    for (const m of proj.missing) {
      if (!byKey[m.key]) byKey[m.key] = [];
      byKey[m.key].push(m.locale);
    }
    const sortedKeys = Object.entries(byKey).sort((a, b) => b[1].length - a[1].length);
    for (const [key, langs] of sortedKeys) {
      const flag = langs.length === LOCALES.length ? '🔴' : '🟡';
      console.log(`  ${flag} ${key}: 缺失于 ${langs.length}/${LOCALES.length} 语言`);
    }
  }

  if (extraCount > 0) {
    console.log(`  ℹ️  多余 key (${extraCount} 处，lang 中有但 en 中没有):`);
    for (const e of proj.extra.slice(0, 20)) {
      console.log(`    [${e.locale}] ${e.key} → "${e.value}"`);
    }
    if (extraCount > 20) console.log(`    ... 还有 ${extraCount - 20} 条`);
  }

  if (hardcodedCount > 0) {
    const byKey = {};
    for (const h of proj.hardcoded) {
      if (!byKey[h.key]) byKey[h.key] = { value: h.value, isKeyAsValue: h.isKeyAsValue, count: 0 };
      byKey[h.key].count++;
    }
    console.log(`  ⚠️  硬编码英文 fallback (${hardcodedCount} 处):`);
    for (const [key, info] of Object.entries(byKey)) {
      const flag = info.isKeyAsValue ? '🔴' : '🟡';
      console.log(`    ${flag} ${key} → "${info.value}" (${info.count} 语言)`);
    }
  }

  if (missingCount === 0 && extraCount === 0 && hardcodedCount === 0) {
    console.log('  ✅ 全部通过');
  }
  console.log('');
}

console.log(`📊 总计: ${totalMissing} 缺失 + ${totalExtra} 多余 + ${totalHardcoded} 硬编码英文`);

if (totalMissing > 0 || totalExtra > 0 || totalHardcoded > 0) {
  if (isCi) process.exit(1);
} else {
  console.log('✅ 所有 i18n key 完整，无硬编码英文');
}
