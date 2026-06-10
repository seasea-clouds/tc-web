#!/usr/bin/env node
/**
 * check-llms.mjs — 验证 llms.txt 文件质量
 *
 * 检查项:
 *   1. 文件是否存在且非空
 *   2. 前 3 行是站点简介（不包含翻译键特征如 Cookie.）
 *   3. 包含至少 6 条服务链接
 *   4. 包含至少 6 条博客文章链接
 *   5. 不包含 i18n 翻译键值对（key: value 模式）
 *
 * 用法:
 *   node packages/scripts/check-llms.mjs [--dir=public] [--ci]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function checkLLMsFile(filePath, isCi) {
  const issues = [];

  if (!fs.existsSync(filePath)) {
    return [`❌ 文件不存在: ${filePath}`];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  
  // 1. 非空
  if (content.trim().length < 200) {
    issues.push(`❌ 文件过短 (${content.length} bytes)`);
  }

  // 2. 前几行是站点简介
  const firstLines = lines.slice(0, 5).join('\n');
  if (firstLines.includes('Cookie.') || firstLines.includes('Navbar.') || firstLines.includes('Home.')) {
    issues.push('❌ 前 5 行包含 i18n 翻译键特征');
  }

  // 3. 包含服务链接（至少 6 条）
  const serviceLinks = content.match(/\/(services\/[a-z-]+)\//g) || [];
  if (serviceLinks.length < 6) {
    issues.push(`❌ 服务链接不足 6 条（${serviceLinks.length} 条）`);
  }

  // 4. 包含博客链接（至少 6 条）
  const blogLinks = content.match(/\/(blog\/[a-z0-9-]+)\//g) || [];
  if (blogLinks.length < 6) {
    issues.push(`❌ 博客链接不足 6 条（${blogLinks.length} 条）`);
  }

  // 5. 不包含 i18n 翻译键
  const i18nPattern = /^-\s+[A-Z][a-zA-Z]+\.\w+:/m;
  if (i18nPattern.test(content)) {
    const matches = content.match(i18nPattern);
    issues.push(`❌ 包含 i18n 翻译键值对: ${matches?.[0] || ''}`);
  }

  // 6. 有语言链接
  const langLinks = content.match(/\[[a-z]{2}\]/g) || [];
  if (langLinks.length < 40) {
    issues.push(`❌ 其他语言链接不足 40 个（${langLinks.length} 个）`);
  }

  return issues;
}

// ── Programmatic API ──────────────────────────────

/**
 * runLLMSCheck — 编程接口，供 build-all.mjs 调用
 * @param {string} dir — 输出目录
 * @returns {number} — 问题数
 */
export function runLLMSCheck(checkDir) {
  const mainFile = path.join(checkDir, 'llms.txt');
  const issues = checkLLMsFile(mainFile);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.log(`  ${issue}`);
    }
  }
  return issues.length;
}

// ── CLI Main ───────────────────────────────────────

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const dirArg = args.find(a => a.startsWith('--dir='));
const dir = dirArg ? dirArg.split('=')[1] : path.resolve(process.cwd(), 'public');

let hasError = false;

console.log('🔍 检查 llms.txt...\n');

// 主文件
const mainIssues = runLLMSCheck(dir);
if (mainIssues > 0) hasError = true;
else console.log('  ✅ llms.txt 格式正确');

// 检查至少一个语言版本文件
const localeFile = path.join(dir, 'llms-en.txt');
if (fs.existsSync(localeFile)) {
  const localeIssues = checkLLMsFile(localeFile);
  if (localeIssues.length > 0) {
    hasError = true;
    for (const issue of localeIssues) {
      console.log(`  ${issue} (llms-en.txt)`);
    }
  } else {
    console.log('  ✅ llms-en.txt 格式正确');
  }
}

// 检查 llms-ctx.txt
const ctxFile = path.join(dir, 'llms-ctx.txt');
if (fs.existsSync(ctxFile)) {
  const ctxContent = fs.readFileSync(ctxFile, 'utf-8');
  if (ctxContent.length < 1000) {
    hasError = true;
    console.log('  ❌ llms-ctx.txt 过短');
  } else {
    console.log(`  ✅ llms-ctx.txt (${(ctxContent.length / 1024).toFixed(0)}KB)`);
  }
}

// 检查语言版本文件数
const allLangFiles = fs.readdirSync(dir).filter(f => /^llms-[a-z]{2}\.txt$/.test(f));
console.log(`\n  ${allLangFiles.length}/${48} 语言版本文件存在`);

if (hasError) {
  console.log('\n❌ llms.txt 检查未通过');
  if (isCi) process.exit(1);
} else {
  console.log('\n✅ llms.txt 全部检查通过');
}
