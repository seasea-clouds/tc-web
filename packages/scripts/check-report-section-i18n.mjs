#!/usr/bin/env node
/* check-section-data-i18n.mjs — 检测报告章节组件中未翻译的数据层英文
 *
 * 扫描 src/core/report/sections/ 下的 TSX 组件，检测以下模式：
 *
 * Pattern A: {xyz.duration} 直接渲染，未包裹 localizeTimeline() 或 lt()
 *   测试: TestingProcess.tsx - {t.duration}
 *   修复: {localizeTimeline(t, t.duration)}
 *
 * Pattern B: {key.replace(/([A-Z])/g, ...)} 键名直接当标签
 *   测试: CccStandards.tsx - {key.replace(/([A-Z])/g, ' $1').trim()}
 *   修复: 使用 t() 翻译
 *
 * Pattern C: {key.replace(/_/g, ' ').replace(...)} 键名直接当标签
 *   测试: NiceClassification.tsx - key.replace(/_/g, ' ').replace(...)
 *   修复: 使用 t() 翻译
 *
 * Pattern D: {term: "English Text", def: t('...')} 术语硬编码英文
 *   测试: template.tsx - 术语定义中的硬编码英文术语
 *   修复: 使用 t('...Term') 翻译
 *
 * 用法:
 *   node packages/scripts/check-section-data-i18n.mjs [--ci]
 *
 * 注意: 本检查不阻塞 CI 构建，仅做信息提示。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const isCi = process.argv.includes('--ci');
const hasProject = process.argv.some(a => a.startsWith('--project='));

const SECTIONS_DIR = path.join(repoRoot, 'apps/portal/src/core/report/sections');
const TEMPLATE_PATH = path.join(repoRoot, 'apps/portal/src/core/report/template.tsx');

/* 术语白名单：这些硬编码术语有理由保持英文（缩写/标准号/品牌名等） */
const GLOSSARY_ALLOW_TERM_EXACT = [
  // 缩写/标准号
  'CCC', 'CNCA', 'GB 4943', 'GB 9254', 'CB Report', 'SRRC', 'SDOC',
  'GACC', 'CIFER', 'CRA', 'CIQ', 'GB 7718', 'GB 28050', 'Decree 248',
  'GB 2760', "NRV%", 'NMPA', 'CSAR', 'ICSC', 'Chinese RP', 'GMP',
  'CBEC', '1210', '9610', 'PIPL', 'Tmall Global',
  'CNIPA', 'Nice Classification', 'Madrid System',
  'HS Code',
];
const LEGER_ENGLISH_DURATIONS = new Set([
  '1-2 weeks', '2-4 weeks', '4-6 weeks', '4-8 weeks', '6-12 weeks',
  '3-8 weeks', '2-3 weeks', '1-3 weeks',
  '1-2 months', '6-9 months', '1-3 months', '3 months',
  '1-3 days', '2-3 working days', '3-5 working days', '5-7 working days',
  'Days', 'Annually',
]);

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  const relPath = path.relative(repoRoot, filePath);

  // Check if file imports localizeTimeline/localizeCost
  const hasLocalizeTimeline = content.includes('localizeTimeline');
  const hasLocalizeCost = content.includes('localizeCost');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Pattern A: {xyz.duration} not wrapped in localizeTimeline/lt()
    // Match JSX interop like {t.duration} or {s.duration}
    const durationMatch = line.match(/\{[a-z]+\.duration\}/);
    if (durationMatch) {
      // Check if this line already uses localizeTimeline or lt()
      if (!line.includes('localizeTimeline') && !line.includes('lt(')) {
        // Also check that the line itself doesn't have lt or localizeTimeline
        issues.push({
          file: relPath,
          line: lineNum,
          pattern: 'A',
          text: `直接渲染 .duration：${durationMatch[0]} — 需包裹 localizeTimeline()`,
          fix: line.substring(0, line.indexOf(durationMatch[0])) +
               `{localizeTimeline(t, ${durationMatch[0].slice(1, -1)})}` +
               line.substring(line.indexOf(durationMatch[0]) + durationMatch[0].length)
        });
      }
    }

    // Pattern B: {key.replace(/([A-Z])/g, ' $1').trim()}
    if (line.includes("key.replace(/([A-Z])/g, ' $1').trim()")) {
      issues.push({
        file: relPath,
        line: lineNum,
        pattern: 'B',
        text: '键名直接转标签（camelCase → label），未使用 t() 翻译',
        fix: '替换为 t() 翻译调用'
      });
    }

    // Pattern C: {key.replace(/_/g, ' ').replace(/\b\w/g, ...)}
    if (line.includes("key.replace(/_/g, ' ')") && line.includes('replace(/\\b\\w/g')) {
      issues.push({
        file: relPath,
        line: lineNum,
        pattern: 'C',
        text: '键名直接转标签（snake_case → Title Case），未使用 t() 翻译',
        fix: '替换为 t() 翻译调用'
      });
    }
  }

  return issues;
}

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  let all = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fp = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      all = all.concat(scanDir(fp));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      all = all.concat(scanFile(fp));
    }
  }
  return all;
}

function checkGlossaryTerms() {
  if (!fs.existsSync(TEMPLATE_PATH)) return [];
  const content = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  const relPath = path.relative(repoRoot, TEMPLATE_PATH);

  // Find {term: "...", def: t('...')} or {term: '...', def: t('...')}
  // where term is NOT wrapped in t()
  const termRe = /\{term:\s*['"]([^'"]+)['"]\s*,\s*def:\s*t\(/g;
  let match;
  while ((match = termRe.exec(content)) !== null) {
    const term = match[1];
    // Skip if all-caps abbreviation or known allowlist entry
    if (GLOSSARY_ALLOW_TERM_EXACT.includes(term)) continue;
    const lineNum = content.substring(0, match.index).split('\n').length;
    issues.push({
      file: relPath,
      line: lineNum,
      pattern: 'D',
      text: `术语硬编码英文: "${term}" — 需使用 t('...Term') 翻译`,
      fix: `替换为 t('someModuleGlossary_${term.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}Term')`
    });
  }

  return issues;
}

function run() {
  console.log('🔍 检测报告章节组件中未翻译的数据层英文...\n');

  const issues = [...scanDir(SECTIONS_DIR), ...checkGlossaryTerms()];

  if (issues.length === 0) {
    console.log('✅ 所有报告章节组件的数据层翻译检查通过\n');
    return true;
  }

  // Group by pattern type
  const byPattern = { A: [], B: [], C: [], D: [] };
  for (const issue of issues) {
    (byPattern[issue.pattern] || []).push(issue);
  }

  for (const [pattern, items] of Object.entries(byPattern)) {
    if (items.length === 0) continue;
    const patternNames = { A: '持续时间字段', B: 'CamelCase键名标签', C: 'SnakeCase键名标签', D: '术语硬编码英文' };
    console.log(`\n📋 模式 ${pattern}: ${patternNames[pattern] || pattern} (${items.length} 个问题)`);
    console.log('─'.repeat(60));
    for (const item of items) {
      console.log(`  📄 ${item.file}:${item.line}`);
      console.log(`    问题: ${item.text}`);
      console.log(`    建议: ${item.fix}`);
    }
  }

  console.log(`\n⚠️  发现 ${issues.length} 个未翻译的数据层英文字段`);

  return false;
}

const passed = run();
if (isCi && !passed) process.exit(1);
