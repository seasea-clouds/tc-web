#!/usr/bin/env node
/**
 * check-report-dates.mjs — 检测 rules.ts 中未翻译的日期和英文字段
 *
 * 检测：
 *   1. 硬编码英文日期（如 "January 1, 2022"）— 应为 t("date_xxx")
 *   2. 任何未被 t() 包裹的英文字段值（数据层文字）
 *   3. 同步检查 template.tsx 中的英文词汇表
 *
 * 用法：
 *   node packages/scripts/check-report-dates.mjs
 *   node packages/scripts/check-report-dates.mjs --ci
 *   node packages/scripts/check-report-dates.mjs --project=site
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const isCI = process.argv.includes('--ci');
const args = process.argv.slice(2);

// Detect project (for CWD-based detection)
function getDetectedProject() {
  const idx = args.findIndex(a => a.startsWith('--project='));
  if (idx !== -1) return args[idx].split('=')[1];
  const cwd = process.cwd();
  const m = cwd.match(/[/]apps[/]([^/]+)/);
  return m ? m[1] : null;
}
const project = getDetectedProject();
// This script only applies to portal (only portal has rules.ts modules)
if (project && project !== 'portal') {
  console.log(`⏭️  check-report-dates: ${project} 无模块 rules.ts，跳过`);
  process.exit(0);
}

let exitCode = 0;
const LINE = '─'.repeat(60);

// ─── 支持的月份名称 (用于检测硬编码日期) ──────────────────────────────
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_RE = new RegExp(`"(${MONTH_NAMES.join('|')})\\\\s+\\\\d{1,2},\\\\s+\\\\d{4}"`);

// ─── 已知可忽略的标准编号/缩写 ────────────────────────────────────────
const STANDARD_NUMBERS = new Set([
  // GB standards
  'GB 7718', 'GB 7718-2011', 'GB 7718-2025', 'GB 2760', 'GB 2760-2014',
  'GB 2760-2024', 'GB 28050', 'GB 28050-2011', 'GB 4706.1', 'GB 4943.1',
  'GB 4943.1-2022', 'GB 4706.xx', 'GB 17625.1', 'GB 7000.1', 'GB 6675',
  'GB/T 23791', 'GB/T 30641', 'GB 2762', 'GB 2762-2022', 'GB 2763',
  'GB 2763-2021', 'GB 29921', 'GB 29921-2021', 'GB 6675.2', 'GB 6675.3',
  'GB 6675.4', 'GB 9706.1', 'GB/T 35914-2018',
  // Other standards
  'ISO 17025', 'ISO 22000', 'ISO 9001', 'HACCP', 'CNCA', 'CAC', 'CNAS',
  'NMPA', 'GACC', 'CCC', 'CIFER', 'CBEC', 'HS', 'CNIPA',
  // Trade terms
  'FOB', 'CIF', 'DDP', 'DAP', 'EXW', 'FCA', 'CPT', 'CIP',
  // Product category HS ranges
]);

// ─── 已知可忽略的英文值（数据常量、标准编号、地区名等）───────────────
// 同步自 check-hardcoded.mjs 的 LEGIT_ENGLISH（仅数据常量部分）
const LEGIT_ENGLISH = new Set([
  // DB key level short descriptions
  'NHC', 'NPC', 'CNCA/SAMR', 'NHC/SAMR', 'NDRC', 'MIIT', 'GACC', 'SAMR', 'CNIPA', 'CNCA',
  'Both', 'SinoTrade', 'SinoTrade Compliance',
  // Regulation identifiers
  'Decree 248 (2021)', 'Decree 249 (2021)',
  'CNIPA 2021 Edition', "Ch.3 Arts.42-47, Ch.9 Arts.148-149",
  'State Council Decree 395', 'NHC',
  // Recognized brand/platform names
  'Tmall Global', 'JD Worldwide', 'WeChat', 'WhatsApp', 'LinkedIn',
  // Data constants that are key identifiers
  'high', 'medium', 'low', 'primary', 'secondary', 'related',
  // Country/region names (data constants in business data)
  'South Korea', 'North America', 'South America', 'South Asia', 'New Zealand',
  // Product category labels (data lookup keys, rendered with lookup t())
  'Alcoholic Beverages (HS 22.03-22.08)',
  'Non-alcoholic Beverages (HS 22.01-22.02)',
  'Confectionery / Chocolate (HS 17.04, 18.06)',
  'Coffee / Tea (HS 09.01-09.02)',
  'Canned / Processed Foods (HS 20)',
  'Sugar / Syrups (HS 17)',
  'Grains / Flour (HS 10-11)',
  'Meat Products (HS 02)',
  'Dairy Products (HS 04)',
  'Seafood / Aquatic (HS 03)',
  'Honey / Bee Products (HS 04.09)',
  'Edible Oils (HS 15)',
  'Seasonings / Condiments (HS 21.03)',
  'Nuts / Dried Fruits (HS 08)',
  'Health / Dietary Supplements (HS 21.06)',
  'Other Food Products',
  'Consumer Electronics (HS 85)',
  'Home Appliances (HS 84)',
  'Lighting Products (HS 85.39, 94.05)',
  "Toys / Children's Products (HS 95.03)",
  'Medical Devices (HS 90)',
  'Skincare (HS 33.04)',
  'Color Cosmetics (HS 33.04)',
  'Sunscreen (HS 33.04) — SPECIAL',
  'Hair Care (HS 33.05)',
  'Fragrance / Perfume (HS 33.03)',
  'Baby Products (HS 33.04)',
  'Food Products',
  'Food & Beverages',
  'Cosmetics / Personal Care',
  'Electronics / Small Appliances',
  'Apparel / Fashion',
  'Electronics / Technology',
  'Health Supplements',
  'Baby / Maternity',
  'Home / Kitchen',
  'Luxury Goods',
  'Beverages',
  'Beverages / Juices',
  'Confectionery / Snacks',
  'Alcoholic Beverages',
  'Infant / Baby Foods',
  'Edible Oils / Fats',
  'Prepackaged Foods (GB 7718)',
  'Dairy Products',
  'Health / Dietary Supplements',
  'Seasonings / Condiments',
]);

// 日期翻译键（已转化为 t() 调用的），用于跳过扫描
const DATE_TRANSLATION_KEYS = new Set([
  'date_jan1_2022', 'date_oct1_2015', 'date_apr20_2012',
  'date_jan1_2013', 'date_feb8_2025', 'date_jun30_2023',
  'date_sep3_2021', 'date_nov22_2021', 'date_nov1_2019', 'date_mar1_2004',
]);

// ─── Check 1: 检测硬编码日期 ──────────────────────────────────────────

function checkHardcodedDates(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines using t()
    if (/t\s*\(/.test(line)) continue;

    // Check for: effectiveDate: "Month Day, Year"
    const dateMatch = line.match(/effectiveDate:\s*"([A-Z][a-z]+ \d{1,2}, \d{4})"/);
    if (dateMatch) {
      issues.push({
        file: filePath,
        line: i + 1,
        message: `硬编码日期: "${dateMatch[1]}" — 应使用 t() 翻译键`,
        severity: 'high',
      });
    }

    // Check for other date-like strings in values (not just effectiveDate)
    const anyDateMatch = line.match(/: \s*"([A-Z][a-z]+ \d{1,2}, \d{4})"/);
    if (anyDateMatch && !dateMatch) {
      issues.push({
        file: filePath,
        line: i + 1,
        message: `硬编码日期字段值: "${anyDateMatch[1]}" — 应使用 t() 翻译键`,
        severity: 'high',
      });
    }
  }

  return issues;
}

// ─── Check 2: 检测未翻译的英文字段值（不在 t() 中的英文显示文本）──────

function checkUntranslatedStrings(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip comments, types, imports, and lines that already call t()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('interface ') || 
        trimmed.startsWith('type ') || trimmed.startsWith('export type') || trimmed.startsWith('export interface')) continue;
    if (/t\s*\(/.test(line)) continue;

    // Skip data structure declarations, arrays, function signatures
    if (trimmed.startsWith('function ') || trimmed.startsWith('const ') || trimmed.startsWith('let ') || 
        trimmed.startsWith('var ')) continue;
    if (/^[\[\{\)]/.test(trimmed)) continue;

    // Check for English strings that look like display text
    // Pattern: "English text longer than 5 chars containing spaces"
    const strRe = /"([A-Z][a-zA-Z][^"]{4,80}?)"/g;
    let match;
    while ((match = strRe.exec(line)) !== null) {
      const val = match[1].trim();

      // Skip short strings
      if (val.length < 5) continue;

      // Skip standard numbers and known legit values
      if (STANDARD_NUMBERS.has(val) || STANDARD_NUMBERS.has(val.substring(0, 15))) continue;
      if (LEGIT_ENGLISH.has(val)) continue;

      // Skip single-word values (likely acronyms or identifiers)
      if (!val.includes(' ') && !val.includes('/') && !val.includes('(')) continue;

      // Skip entirely uppercase
      if (val === val.toUpperCase()) continue;

      // Skip URLs
      if (val.startsWith('http://') || val.startsWith('https://')) continue;

      // Skip values that look like percentage or price ranges
      if (/^[\d%$,.()\s]+$/.test(val)) continue;

      // Check if this is inside a t() call context (already skipped above, but double-check)
      const lineUpToMatch = line.substring(0, match.index);
      if (/\bt\s*\(\s*['"`]/.test(lineUpToMatch)) continue;

      // Only flag strings that look like display text (has verb/adjective structure)
      if (!/^[A-Z][a-z]/.test(val)) continue;
      if (!/[a-z]{3,}/.test(val)) continue;

      // Check if value appears to be display text: has space, or contains punctuation
      const looksLikeDisplay = val.includes(' ') || val.includes(',') || 
                               val.includes('(') || val.includes('/') || val.includes('—');

      if (looksLikeDisplay) {
        issues.push({
          file: filePath,
          line: i + 1,
          message: `硬编码英文: "${val.substring(0, 80)}" — 需要 t() 翻译键`,
          severity: 'medium',
        });
      }
    }
  }

  return issues;
}

// ─── Check 3: 检查 template.tsx 中硬编码词汇表条目 ────────────────────

function checkGlossaryTerms(content, filePath) {
  const issues = [];
  const lines = content.split('\n');
  const knownAcronyms = [
    'GACC', 'CIFER', 'CRA', 'CIQ', 'HS Code', 'NMPA', 'CSAR', 'ICSC',
    'GMP', 'CCC', 'CNCA', 'SRRC', 'SDOC', 'CBEC', 'PIPL', 'CNIPA',
    'Decree 248', 'GB 7718', 'GB 28050', 'GB 2760', 'GB 4943',
    'GB 9254', 'NRV%', 'Nice Classification', 'Madrid System',
    'Tmall Global', 'Chinese RP', 'Factory Audit', 'CB Report',
    '1210', '9610',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const strMatch = line.match(/\{term:\s*"([A-Za-z\- ']{6,})"\s*,\s*def:/);
    if (strMatch) {
      const term = strMatch[1];
      const isAcronym = knownAcronyms.some(a => term.startsWith(a) || term === a);
      if (!isAcronym && !term.startsWith('GB ') && !term.startsWith('GB/T ')) {
        issues.push({
          file: filePath,
          line: i + 1,
          message: `硬编码词汇表术语: "${term}" — 应使用 t() 翻译键`,
          severity: 'high',
        });
      }
    }
  }

  return issues;
}

// ─── 主流程 ───────────────────────────────────────────────────────────

const modulesDir = path.join(repoRoot, 'apps/portal/modules');
const templatePath = path.join(repoRoot, 'apps/portal/src/core/report/template.tsx');

let allIssues = [];

// Check 1 & 2: Scan all module rules.ts files
if (fs.existsSync(modulesDir)) {
  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const mod of moduleDirs) {
    const rulesFile = path.join(modulesDir, mod, 'rules.ts');
    if (!fs.existsSync(rulesFile)) continue;

    const content = fs.readFileSync(rulesFile, 'utf-8');
    const relPath = `apps/portal/modules/${mod}/rules.ts`;

    allIssues.push(...checkHardcodedDates(content, relPath));
    allIssues.push(...checkUntranslatedStrings(content, relPath));
  }
}

// Check 3: Scan template.tsx for glossary terms
if (fs.existsSync(templatePath)) {
  const content = fs.readFileSync(templatePath, 'utf-8');
  allIssues.push(...checkGlossaryTerms(content, 'apps/portal/src/core/report/template.tsx'));
}

// ─── 输出 ─────────────────────────────────────────────────────────────

console.log(`${LINE}`);
console.log('📅 check-report-dates: 模块规则文件日期和i18n完整性检查');
console.log(`${LINE}`);

if (allIssues.length === 0) {
  console.log('✅ 未发现硬编码日期或未翻译英文字段');
  console.log(`${LINE}`);
} else {
  const highIssues = allIssues.filter(i => i.severity === 'high');
  const mediumIssues = allIssues.filter(i => i.severity === 'medium');

  if (highIssues.length > 0) {
    console.log(`🔴 硬编码日期/词汇表问题 (${highIssues.length}):`);
    for (const issue of highIssues) {
      console.log(`  📄 ${issue.file}:${issue.line}`);
      console.log(`     ${issue.message}`);
    }
  }

  if (mediumIssues.length > 0) {
    console.log(`🟡 可能未翻译的英文字段 (${mediumIssues.length}):`);
    for (const issue of mediumIssues) {
      console.log(`  📄 ${issue.file}:${issue.line}`);
      console.log(`     ${issue.message}`);
    }
  }

  console.log(`${LINE}`);
  console.log(`总问题数: ${allIssues.length} (🔴 ${highIssues.length}, 🟡 ${mediumIssues.length})`);
  console.log(`${LINE}`);

  if (highIssues.length > 0) exitCode = 1;
}

process.exit(exitCode);
