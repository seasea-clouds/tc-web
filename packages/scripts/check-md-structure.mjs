#!/usr/bin/env node
/**
 * check-md-structure.mjs — MDX 内容结构检查
 *
 * 在编译流水线中检测常见的 Markdown/MDX 结构问题。
 *
 * 问题类型：
 *   [E07] heading-manual-number  — h3 标题包含手动编号（"### 1. text" / "### 3、text"）
 *                                   CSS 已自动编号所有 h3 元素，手动编号导致双重编号
 *   [W03] code-block-process-flow — 代码块包含流程步骤（"Step N:" / "第N步:")
 *                                   流程步骤应用有序列表（<ol>），不应使用代码块
 *
 * 用法：
 *   node check-md-structure.mjs                # 检查所有语言
 *   node check-md-structure.mjs --ci            # CI 模式，有 error 则 exit 1
 *   node check-md-structure.mjs --lang=zh       # 只检查指定语言
 *   node check-md-structure.mjs --project=blog  # 检查 blog 项目（默认）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const filterLang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || null;
const project = args.find(a => a.startsWith('--project='))?.split('=')[1] || 'blog';

// 支持的子站及其 MDX 内容目录
const PROJECT_CONTENT_DIRS = {
  blog: 'apps/blog/content',
};

function getContentDir(p) {
  return PROJECT_CONTENT_DIRS[p] ? path.join(repoRoot, PROJECT_CONTENT_DIRS[p]) : null;
}

// ============================================================
// 规则定义
// ============================================================
const RULES = [
  {
    id: 'E07',
    description: 'h3 标题包含手动编号（"### N." 或 "### N、"），与 CSS 自动编号冲突导致双重编号',
    severity: 'error',
    // 检查：行以 "### " 开头，后跟数字 + "." 或 "、"
    check(line, lineNum, lang) {
      // 只匹配 1-20 的编号，3+ 位数字（如 248. rendelet）是法规编号引用
      return /^###\s*(?:[1-9]|1[0-9]|20|30)[.、]/.test(line);
    },
  },
  {
    id: 'W03',
    description: '代码块包含流程步骤（"Step N:" / "第N步:"），应用有序列表替代代码块',
    severity: 'warning',
    // 全局检查：扫描文件中的代码块
    checkPerFile(content, filePath) {
      const issues = [];
      // 匹配 fenced code blocks
      const codeBlockRegex = /```[\s\S]*?```/g;
      let match;
      while ((match = codeBlockRegex.exec(content)) !== null) {
        const codeContent = match[0];
        const lines = codeContent.split('\n');
        const stepLines = lines.filter(line => {
          const trimmed = line.trim();
          // Step N: 或 第N步: 或 第 N 步： 或 Step N：
          return /^(?:Step\s+\d+[：:]|第\s*\d+\s*步[：:])/i.test(trimmed);
        });

        if (stepLines.length >= 3) {
          // 找到代码块在文件中的大致位置
          const beforeContent = content.slice(0, match.index);
          const lineNum = beforeContent.split('\n').length;
          issues.push({
            line: lineNum,
            text: `代码块包含 ${stepLines.length} 行流程步骤，应以有序列表（<ol>）替代`,
            description: `流程步骤示例: "${stepLines[0].trim().slice(0, 80)}"`,
          });
        }
      }
      return issues;
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
  const fileFindings = [];

  // Per-file rules (W03)
  for (const rule of RULES) {
    if (!rule.checkPerFile) continue;
    const result = rule.checkPerFile(content, filePath);
    if (Array.isArray(result)) {
      for (const issue of result) {
        fileFindings.push({
          rule: rule.id,
          severity: rule.severity,
          line: issue.line,
          text: issue.text,
          description: issue.description,
        });
        if (rule.severity === 'error') totalErrors++;
        else totalWarnings++;
      }
    }
  }

  // Per-line rules (E07)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const rule of RULES) {
      if (rule.checkPerFile) continue; // already handled above
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
    findings.push({ file: relPath, lang, issues: fileFindings });
  }
  totalFiles++;
}

function scanContentDir() {
  const contentDir = getContentDir(project);
  if (!contentDir || !fs.existsSync(contentDir)) {
    console.log(`⚠️  Content directory for project "${project}" not found, skipping.`);
    return;
  }

  const langs = fs.readdirSync(contentDir).filter(d => {
    const full = path.join(contentDir, d);
    return fs.statSync(full).isDirectory();
  });

  for (const lang of langs) {
    if (filterLang && lang !== filterLang) continue;
    const langDir = path.join(contentDir, lang);
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
  console.log(`  MDX 内容结构检查 (${project})`);
  console.log(`═══════════════════════════════════════════════\n`);

  if (findings.length === 0) {
    console.log('✅ 未发现内容结构问题');
    console.log(`  扫描文件: ${totalFiles}`);
    return true;
  }

  for (const { file, lang, issues } of findings) {
    console.log(`┌─ ${file} [${lang}]`);
    for (const issue of issues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
      const loc = issue.line === '*' ? '(文件级)' : `:${issue.line}`;
      console.log(`│  ${icon} [${issue.rule}]${loc}`);
      console.log(`│     ${issue.description}`);
      console.log(`│     > ${issue.text}`);
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
