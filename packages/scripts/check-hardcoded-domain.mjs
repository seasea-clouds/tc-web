#!/usr/bin/env node
/**
 * check-hardcoded-domain.mjs — 检查源码中硬编码的 dev 域名
 *
 * 扫描 src/ 目录下的 .ts/.tsx 文件，查找非法的 *.pages.dev 域名引用。
 * Cloudflare Workers middleware 中合法的路由逻辑会被排除。
 *
 * 用法:
 *   node packages/scripts/check-hardcoded-domain.mjs           # 检查全部
 *   node packages/scripts/check-hardcoded-domain.mjs --ci      # 失败时 exit 1
 *   node packages/scripts/check-hardcoded-domain.mjs apps/blog # 仅检查 blog
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_DIRS = [
  'apps/site/src',
  'apps/portal/src',
  'apps/blog/src',
  'packages/ui/src',
];

/** 合法引用 pages.dev 的文件路径模式（这些文件的路由逻辑需要处理 dev 域名） */
const LEGITIMATE_PATTERNS = [
  /functions\/_middleware\.ts$/,  // CF Workers middleware 路由逻辑
  /functions\/middleware\.ts$/,
  /functions\/[^/]+\.ts$/,        // 其他 CF Functions
];

/** 排除分析的目录 */
const EXCLUDE_DIRS = ['node_modules', '.next', 'out', '.turbo'];

function isLegitimateFile(filePath) {
  return LEGITIMATE_PATTERNS.some(pattern => pattern.test(filePath));
}

function isInCommentOrString(line, col) {
  // Simplified check: lines starting with * or // are comments
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // Check if the pages.dev is inside a comment or docstring
  const before = line.substring(0, col);
  const after = line.substring(col);
  return false;
}

function scanFile(filePath) {
  const relPath = path.relative(repoRoot, filePath);
  if (isLegitimateFile(relPath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  // 匹配 *.pages.dev 域名，排除注释行和 URL 中的合法引用
  const pattern = /([a-zA-Z0-9_-]+\.pages\.dev)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 跳过注释行
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    let match;
    while ((match = pattern.exec(line)) !== null) {
      const domain = match[1];

      // 跳过 docstring 中的域名
      const before = line.substring(0, match.index);
      if (before.includes('//') && !before.includes('http')) continue;
      if (before.includes('*') && !before.includes('http')) continue;

      issues.push({
        file: relPath,
        line: i + 1,
        domain,
        snippet: line.trim().substring(0, 100),
      });
    }
  }

  return issues;
}

function scanDir(dirPath) {
  const absPath = path.resolve(dirPath);
  if (!fs.existsSync(absPath)) return [];
  let all = [];
  for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
    const fp = path.join(absPath, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
        all = all.concat(scanDir(fp));
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      all = all.concat(scanFile(fp));
    }
  }
  return all;
}

// ── Programmatic API ──────────────────────────────

/**
 * runDomainCheck — 编程接口，供 build-all.mjs 调用
 * @param {string[]} dirs — 要扫描的目录列表，默认 DEFAULT_DIRS
 * @returns {number} — 发现的问题数
 */
export function runDomainCheck(customDirs) {
  const dirs = customDirs || DEFAULT_DIRS.map(d => path.join(repoRoot, d));
  let allIssues = [];
  for (const dir of dirs) {
    allIssues = allIssues.concat(scanDir(dir));
  }
  if (allIssues.length > 0) {
    for (const issue of allIssues) {
      console.log(`  📄 ${issue.file}:${issue.line}`);
      console.log(`    域名: ${issue.domain}`);
      console.log(`    代码: ${issue.snippet}\n`);
    }
  }
  return allIssues.length;
}

// ── CLI Main ───────────────────────────────────────

const args = process.argv.slice(2);
const isCI = args.includes('--ci');

if (process.argv[1] === fileURLToPath(import.meta.url) || args.length > 0) {
  const customDir = args.find(a => !a.startsWith('--'));
  let dirs;
  if (customDir) {
    dirs = [customDir.startsWith('/') ? customDir : path.resolve(repoRoot, customDir)];
  } else {
    dirs = DEFAULT_DIRS.map(d => path.join(repoRoot, d));
  }

  const count = runDomainCheck(dirs);
  if (count === 0) {
    console.log('✅ 未发现硬编码的 *.pages.dev 域名引用');
  } else {
    console.log(`❌ 发现 ${count} 处硬编码 *.pages.dev 域名`);
    if (isCI) process.exit(1);
  }
}
