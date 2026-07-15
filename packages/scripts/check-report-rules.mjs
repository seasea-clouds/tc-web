#!/usr/bin/env node
/**
 * check-report-rules.mjs — 报告规则文件中硬编码英文检查
 *
 * 检测 apps/portal/modules 下 rules.ts 中的硬编码英文字符串
 * （应为 t() 调用），以及 template.tsx 中的硬编码词汇表条目。
 *
 * 用法：
 *   node packages/scripts/check-report-rules.mjs
 *   node packages/scripts/check-report-rules.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const isCI = process.argv.includes('--ci');

let exitCode = 0;
const LINE = '─'.repeat(60);
const issues = [];

// ─── 1. 检查 rules.ts 中的 effectiveDate 硬编码 ──────────────────────

const rulesDir = path.join(repoRoot, 'apps/portal/modules');
if (fs.existsSync(rulesDir)) {
  const moduleDirs = fs.readdirSync(rulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name);

  for (const mod of moduleDirs) {
    const rulesFile = path.join(rulesDir, mod, 'rules.ts');
    if (!fs.existsSync(rulesFile)) continue;

    const content = fs.readFileSync(rulesFile, 'utf-8');
    const lines = content.split('\n');

    // Check for hardcoded effectiveDate (not wrapped in t())
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match "effectiveDate": "string that is not t("
      const effectiveDateMatch = line.match(/"effectiveDate":\s*"([^"]+)"/);
      if (effectiveDateMatch) {
        const raw = effectiveDateMatch[1];
        if (raw === 'See document' || raw.includes('months') || raw.includes('weeks') || raw.includes('days')) {
          issues.push({
            file: `apps/portal/modules/${mod}/rules.ts`,
            line: i + 1,
            message: `硬编码英文 effectiveDate: "${raw}" — 应使用 t() 翻译键`,
          });
        }
      }
    }

    // Check for hardcoded filingType.timeline values
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const timelineMatch = line.match(/timeline:\s*\{\s*ordinary:\s*"([^"]+)"/);
      if (timelineMatch) {
        const raw = timelineMatch[1];
        if (raw.includes('months') || raw.includes('weeks')) {
          // This is OK if the component uses localizeTimeline, but flag it
          // as a reminder that raw timeline strings should be localized
        }
      }
    }
  }
}

// ─── 2. 检查 template.tsx 中的硬编码词汇表条目 ─────────────────────────

const templateFile = path.join(repoRoot, 'apps/portal/src/core/report/template.tsx');
if (fs.existsSync(templateFile)) {
  const content = fs.readFileSync(templateFile, 'utf-8');
  const lines = content.split('\n');

  // Check for term: "English String" patterns that should be t()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match {term: "long English phrase"} but not {term: "short acronym"}
    const termMatch = line.match(/\{term:\s*"([A-Za-z\- ]{6,})"\s*,/);
    if (termMatch) {
      const term = termMatch[1];
      // Skip known acronyms and standard codes
      const acroynyms = [
        'GACC', 'CIFER', 'CRA', 'CIQ', 'HS Code', 'NMPA', 'CSAR', 'ICSC',
        'GMP', 'CCC', 'CNCA', 'SRRC', 'SDOC', 'CBEC', 'PIPL', 'CNIPA',
        'Decree 248', 'GB 7718', 'GB 28050', 'GB 2760', 'GB 4943',
        'GB 9254', 'NRV%', 'Nice Classification', 'Madrid System',
        'Tmall Global', 'Chinese RP', 'Factory Audit', 'CB Report',
        '1210', '9610', 'GB/T',
      ];
      const isAcronym = acroynyms.some(a => term.startsWith(a) || term === a);
      if (!isAcronym && !term.startsWith('GB ')) {
        issues.push({
          file: 'apps/portal/src/core/report/template.tsx',
          line: i + 1,
          message: `硬编码英文词汇表术语: "${term}" — 应使用 t() 翻译键`,
        });
      }
    }
  }
}

// ─── 输出 ─────────────────────────────────────────────────────────────

if (issues.length === 0) {
  console.log(`${LINE}`);
  console.log('✅ check-report-rules: 未发现硬编码英文问题');
  console.log(`${LINE}`);
} else {
  console.log(`${LINE}`);
  console.log(`❌ check-report-rules: 发现 ${issues.length} 个问题`);
  console.log(`${LINE}`);
  for (const issue of issues) {
    console.log(`  📄 ${issue.file}:${issue.line}`);
    console.log(`     ${issue.message}`);
  }
  console.log(`${LINE}`);
  exitCode = 1;
}

process.exit(exitCode);
