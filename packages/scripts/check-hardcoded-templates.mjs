#!/usr/bin/env node
/* check-hardcoded-templates.mjs — 检测数据层硬编码英文字符串
 *
 * 扫描 modules 下的 rules.ts 等数据文件中的硬编码英文字符串，
 * 这些字符串不在 JSX 中，而是出现在 note/dimension/explanation 等数据属性中。
 *
 * Severity 分级:
 *   DYNAMIC  — 模板字符串 ${n} tests required (需要函数式翻译)
 *   STATIC   — 纯英文字符串 "2-4 weeks", "$500-2,000" (可以静态翻译)
 *
 * 用法:
 *   node packages/scripts/check-hardcoded-templates.mjs
 *   node packages/scripts/check-hardcoded-templates.mjs --ci   # 发现时 exit 1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const isCi = process.argv.includes('--ci');

const MODULES_DIR = path.join(repoRoot, 'apps/portal/modules');

/* 检测模板字面量中的英文片段 (如 `${n} tests required`) */
function hasHardcodedTemplate(line) {
  // Skip lines that already use t()
  if (/\.t\(|t\(/.test(line)) return null;

  // Match template literal backtick strings that have English prose AND interpolation
  const tmplMatch = line.match(/`[^`]*\$\{[^}]+}[^`]*`/);
  if (!tmplMatch) return null;

  const tmpl = tmplMatch[0];

  // Check if the template contains English prose patterns
  const englishMarkers = /\b(test|pathway|compliance|cost|estimated|required|available)\b/i;
  const hasEnglish = englishMarkers.test(tmpl);

  if (!hasEnglish) return null;

  // Check that it's not inside a t() call
  const beforeTmpl = line.substring(0, line.indexOf(tmplMatch[0]));
  if (/[.bt]\s*\(/.test(beforeTmpl)) return null;

  return tmpl.substring(0, 120);
}

/* 检测纯英文字符串 (如 "2-4 weeks", "$500-2,000", "Platform onboarding") */
function hasHardcodedStatic(line) {
  // Skip lines that already use t()
  if (/\.t\(|t\(/.test(line)) return null;
  // Skip comment lines
  if (line.trimStart().startsWith('//')) return null;

  // Match string values in data fields (note, dimension, explanation, etc.)
  // Handles both quoted keys: "note": "text" and unquoted keys: note: "text"
  const attrMatch = line.match(/(?:"note"|note|explanation|dimension|estimatedRange|duration|notes)\s*:\s*"([^"]+)/);
  if (!attrMatch) return null;
  const val = attrMatch[1].trim();

  // Skip known-legitimate values
  const skipPatterns = [
    /^[A-Z][a-z]+\s*$/,         // Single word like "Registered"
    /^\d[\d.\/-]*$/,             // Pure numeric
    /^\$[\d,]+/,                 // Dollar amount
    /^[A-Z]{2,}$/,              // ALLCAPS abbreviation
    /^Varies$/,                  // Varies
    /^Standard$/,                // Standard
    /^Check import$/,            // Check import
    /^Both$/,                    // Both
    /All documents in English/,  // Known i18n note
    /English accepted/,          // Known i18n note
  ];
  for (const p of skipPatterns) {
    if (p.test(val)) return null;
  }

  // Must have mixed case with some lowercase prose
  if (val.length < 5) return null;
  if (!/[a-z]/.test(val)) return null;

  return val.substring(0, 120);
}

/* 扫描文件 */
function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check dynamic template
    const tmpl = hasHardcodedTemplate(line);
    if (tmpl) {
      issues.push({ severity: 'dynamic', line: lineNum, text: tmpl, file: filePath });
      continue; // Don't double-report same line
    }

    // Check static string
    const staticStr = hasHardcodedStatic(line);
    if (staticStr) {
      issues.push({ severity: 'static', line: lineNum, text: staticStr, file: filePath });
    }
  }

  return issues;
}

/* 主逻辑 */
function run() {
  const allIssues = [];

  function findRules(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findRules(fullPath);
      } else if (entry.name === 'rules.ts') {
        allIssues.push(...scanFile(fullPath));
      }
    }
  }

  if (fs.existsSync(MODULES_DIR)) findRules(MODULES_DIR);

  // Also check core/report files
  const coreDir = path.join(repoRoot, 'apps/portal/src/core');
  if (fs.existsSync(coreDir)) {
    for (const f of ['ReportShell.tsx', 'template.tsx']) {
      const fp = path.join(coreDir, 'report', f);
      if (fs.existsSync(fp)) allIssues.push(...scanFile(fp));
    }
  }

  /* output */
  const dynamics = allIssues.filter(i => i.severity === 'dynamic');
  const statics = allIssues.filter(i => i.severity === 'static');

  console.log('\n═══════════════════════════════════════════════');
  console.log('  数据层英文模板检测');
  console.log('═══════════════════════════════════════════════\n');

  if (allIssues.length === 0) {
    console.log('✅ 无硬编码英文模板\n');
    return true;
  }

  if (dynamics.length > 0) {
    console.log(`DYNAMIC: ${dynamics.length} 个动态模板字符串 (需要函数式翻译)\n`);
    for (const d of dynamics) {
      const rel = path.relative(repoRoot, d.file);
      console.log(`  ${rel}:${d.line}`);
      console.log(`    ${d.text}\n`);
    }
  }

  if (statics.length > 0) {
    console.log(`STATIC: ${statics.length} 个静态英文字符串 (可用翻译键)\n`);
    for (const s of statics) {
      const rel = path.relative(repoRoot, s.file);
      console.log(`  ${rel}:${s.line}`);
      console.log(`    ${s.text}\n`);
    }
  }

  console.log('─────────────────────────────────────────────');
  console.log(`总计: ${allIssues.length}`);
  console.log(`  DYNAMIC: ${dynamics.length} (需函数式翻译)`);
  console.log(`  STATIC: ${statics.length} (可用翻译键)`);
  console.log('─────────────────────────────────────────────\n');

  return allIssues.length === 0;
}

const passed = run();
if (isCi && !passed) process.exit(1);
