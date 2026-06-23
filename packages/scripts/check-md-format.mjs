#!/usr/bin/env node
/**
 * check-md-format.mjs — Markdown 内容格式质量检查（精细化语言策略）
 *
 * 按语言组分别制定检查规则，不是一刀切：
 *
 * 语言组定义：
 *   CJK_ZH  = zh          中文：用冒号不用 em-dash，禁止双破折号
 *   CJK_JA  = ja          日文：允许 em-dash，禁止双破折号
 *   CJK_KO  = ko          韩文：允许 em-dash，禁止双破折号
 *   DE      = de          德文：列表项用 en-dash 不用 em-dash
 *   RU      = ru uk be    俄文/斯拉夫：允许 em-dash，禁止 en/em 混用
 *   EUROPEAN = en fr es it pt nl pl ...  西欧：允许 em-dash
 *   RTL     = ar fa he ur 阿拉伯/RTL：允许 em-dash
 *   INDIC   = hi ta bn ne si sw ...     南亚/其他：允许 em-dash
 *
 * 规则：
 *   [E01] literal-punctuation-words  — 中/日/韩 文字误作标点（句号/마침표等）
 *   [E02] double-em-dash             — 所有语言禁止 "——"
 *   [E03] zh-em-dash-in-list         — 中文列表项应用冒号不用 em-dash
 *   [E04] de-em-dash-in-list         — 德文列表项应用 en-dash 不用 em-dash
 *   [E05] de-en-dash-in-body         — 德文正文中的 em-dash 应改为 en-dash
 *   [W01] excessive-em-dash          — 单行超过 2 个 em-dash（所有语言）
 *   [W02] ru-en-em-mix               — 俄文同一文件混用 en/em-dash
 *
 * 用法：
 *   node check-md-format.mjs
 *   node check-md-format.mjs --ci          # CI 模式，有 error 则 exit 1
 *   node check-md-format.mjs --lang=zh     # 只检查指定语言
 *   node check-md-format.mjs --rule=E02    # 只运行指定规则
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const BLOG_CONTENT_DIR = path.join(repoRoot, 'apps/blog/content');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const filterLang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || null;
const filterRule = args.find(a => a.startsWith('--rule='))?.split('=')[1]?.toUpperCase() || null;

// ============================================================
// 语言组定义
// ============================================================
const LANG_GROUPS = {
  CJK_ZH:    ['zh'],
  CJK_JA:    ['ja'],
  CJK_KO:    ['ko'],
  DE:        ['de'],
  RU:        ['ru', 'uk', 'be', 'bg', 'sr'],
  EUROPEAN:  ['en', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'sk', 'hr', 'hu',
              'ro', 'el', 'da', 'sv', 'no', 'fi', 'et', 'lv', 'lt', 'ca', 'af',
              'az', 'hy', 'ka', 'sq', 'sl', 'bn'],
  RTL:       ['ar', 'fa', 'he', 'ur'],
  INDIC:     ['hi', 'ta', 'ne', 'si', 'sw', 'ms', 'id', 'th', 'tr', 'vi'],
};

function getLangGroup(lang) {
  for (const [group, langs] of Object.entries(LANG_GROUPS)) {
    if (langs.includes(lang)) return group;
  }
  return 'EUROPEAN'; // 默认归入欧洲语言组
}

// ============================================================
// 规则定义
// ============================================================
const RULES = [
  {
    id: 'E01',
    name: 'literal-punctuation-words',
    severity: 'error',
    description: '文字误作标点（翻译残留）',
    langs: ['zh', 'ja', 'ko'],
    check: (line, _lineNum, lang) => {
      const patterns = {
        zh: [/[，,]\s*句号\s*$/, /[，,]\s*逗号\s*$/, /[，,]\s*感叹号\s*$/, /[，,]\s*问号\s*$/],
        ja: [/[、，]\s*句点\s*$/, /[、，]\s*読点\s*$/, /[、，]\s*期間\s*$/],
        ko: [/[，,]\s*마침표\s*$/, /[，,]\s*쉼표\s*$/],
      };
      const langPatterns = patterns[lang] || [];
      return langPatterns.some(p => p.test(line));
    },
  },
  {
    id: 'E02',
    name: 'double-em-dash',
    severity: 'error',
    description: '双破折号 "——"（所有语言禁止，AI 味重）',
    langs: null, // 所有语言
    check: (line) => /——/.test(line),
  },
  {
    id: 'E03',
    name: 'zh-em-dash-in-list',
    severity: 'error',
    description: '中文列表项应用冒号，不用 em-dash',
    langs: ['zh'],
    check: (line) => {
      // 列表项：- **Title** — Description 或 1. **Title** — Description
      return /^[\s]*[-*]\s.*\*\*\s*—\s/.test(line) ||
             /^[\s]*\d+\.\s.*\*\*\s*—\s/.test(line);
    },
  },
  {
    id: 'E04',
    name: 'de-em-dash-in-list',
    severity: 'error',
    description: '德文列表项应用 en-dash (–)，不用 em-dash (—)',
    langs: ['de'],
    check: (line) => {
      return /^[\s]*[-*]\s.*—/.test(line) ||
             /^[\s]*\d+\.\s.*—/.test(line);
    },
  },
  {
    id: 'E05',
    name: 'de-en-dash-in-body',
    severity: 'warning',
    description: '德文中正文 em-dash 建议改为 en-dash',
    langs: ['de'],
    check: (line, _lineNum) => {
      // 排除 frontmatter 和代码块
      if (line.startsWith('---') || line.startsWith('```')) return false;
      // 只检查非列表行的 em-dash
      if (/^[\s]*[-*]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) return false;
      return /—/.test(line);
    },
  },
  {
    id: 'W01',
    name: 'excessive-em-dash',
    severity: 'warning',
    description: '单行出现过多 em-dash（超过 2 个）',
    langs: null,
    check: (line) => (line.match(/—/g) || []).length > 2,
  },
  {
    id: 'W02',
    name: 'ru-en-em-mix',
    severity: 'warning',
    description: '俄文文件混用 en-dash 和 em-dash，应统一',
    langs: ['ru', 'uk', 'be', 'bg', 'sr'],
    checkPerFile: (content) => {
      const hasEnDash = / – /.test(content);
      const hasEmDash = / — /.test(content);
      return hasEnDash && hasEmDash;
    },
  },
];

// ============================================================
// 扫描逻辑
// ============================================================
let totalFiles = 0;
let totalErrors = 0;
let totalWarnings = 0;
const findings = [];

function scanFile(filePath, lang) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(repoRoot, filePath);
  const langGroup = getLangGroup(lang);
  const fileFindings = [];

  // Per-file rules (W02)
  for (const rule of RULES) {
    if (rule.id !== 'W02') continue;
    if (rule.langs && !rule.langs.includes(lang)) continue;
    if (filterRule && rule.id !== filterRule) continue;
    if (rule.checkPerFile && rule.checkPerFile(content)) {
      fileFindings.push({
        rule: rule.id,
        severity: rule.severity,
        line: '*',
        text: `(整个文件) en-dash 和 em-dash 混用`,
        description: rule.description,
      });
      if (rule.severity === 'error') totalErrors++;
      else totalWarnings++;
    }
  }

  // Per-line rules
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const rule of RULES) {
      if (rule.id === 'W02') continue; // per-file rule
      if (filterRule && rule.id !== filterRule) continue;

      // 语言过滤
      if (rule.langs && !rule.langs.includes(lang)) continue;

      if (rule.check(line, lineNum, lang)) {
        fileFindings.push({
          rule: rule.id,
          severity: rule.severity,
          line: lineNum,
          text: line.trim().slice(0, 120),
          description: rule.description,
        });

        if (rule.severity === 'error') totalErrors++;
        else totalWarnings++;
      }
    }
  }

  if (fileFindings.length > 0) {
    findings.push({ file: relPath, lang, langGroup, issues: fileFindings });
  }
  totalFiles++;
}

function scanContentDir() {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) {
    console.log('⚠️  Blog content directory not found, skipping.');
    return;
  }

  const langs = fs.readdirSync(BLOG_CONTENT_DIR).filter(d => {
    const full = path.join(BLOG_CONTENT_DIR, d);
    return fs.statSync(full).isDirectory();
  });

  for (const lang of langs) {
    if (filterLang && lang !== filterLang) continue;
    const langDir = path.join(BLOG_CONTENT_DIR, lang);
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.mdx'));

    for (const file of files) {
      scanFile(path.join(langDir, file), lang);
    }
  }
}

// ============================================================
// 输出
// ============================================================
function printResults() {
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Markdown 格式质量检查（精细化语言策略）`);
  console.log(`═══════════════════════════════════════════════\n`);

  if (findings.length === 0) {
    console.log('✅ 未发现格式问题');
    console.log(`  扫描文件: ${totalFiles}`);
    return true;
  }

  // 按语言组分组输出
  const byGroup = {};
  for (const f of findings) {
    const g = f.langGroup;
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(f);
  }

  for (const [group, items] of Object.entries(byGroup)) {
    const groupErrors = items.reduce((s, f) => s + f.issues.filter(i => i.severity === 'error').length, 0);
    const groupWarnings = items.reduce((s, f) => s + f.issues.filter(i => i.severity === 'warning').length, 0);
    console.log(`┌─ ${group} (${items.length} 文件, ${groupErrors} 错误, ${groupWarnings} 警告)`);

    for (const { file, issues } of items) {
      for (const issue of issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
        const loc = issue.line === '*' ? '(文件级)' : `:${issue.line}`;
        console.log(`│  ${icon} [${issue.rule}] ${file}${loc}`);
        console.log(`│     ${issue.description}`);
        console.log(`│     > ${issue.text}`);
      }
    }
    console.log(`└─`);
  }

  console.log(`\n  扫描文件: ${totalFiles}  错误: ${totalErrors}  警告: ${totalWarnings}`);
  return totalErrors === 0;
}

// ============================================================
// 主流程
// ============================================================
scanContentDir();
const passed = printResults();
console.log('');

if (isCi && !passed) {
  process.exit(1);
}
