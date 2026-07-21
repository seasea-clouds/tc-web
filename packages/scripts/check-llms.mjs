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

function checkLLMsFile(filePath) {
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

  // 4. 包含博客链接（至少 6 条）— 接受 URL 或描述性文本
  const blogLinks = content.match(/\/(blog\/[a-z0-9-]+)\//g) || [];
  const blogTexts = content.match(/^- Blog post/mg) || [];
  const blogCount = blogLinks.length + blogTexts.length;
  if (blogCount < 6) {
    issues.push(`❌ 博客链接不足 6 条（${blogLinks.length} 条 URL + ${blogTexts.length} 条描述）`);
  }

  // 5. 不包含 i18n 翻译键（允许 "Key Content" 部分内的有意键值对）
  const keyContentMatch = content.match(/## Key Content\n([\s\S]*?)(?=\n## |$)/);
  let contentWithoutKeyContent = content;
  if (keyContentMatch) {
    contentWithoutKeyContent = content.replace(keyContentMatch[0], '\n## Key Content\n[KEY CONTENT SKIPPED]\n');
  }
  const i18nPattern = /^-\s+[A-Z][a-zA-Z]+\.\w+:/m;
  if (i18nPattern.test(contentWithoutKeyContent)) {
    const matches = contentWithoutKeyContent.match(i18nPattern);
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
 * 检查主文件 + 语言版本文件 + llms-ctx.txt + 语言版本文件数
 * @param {string} checkDir — 输出目录
 * @returns {number} — 问题数（0 = 通过）
 */
export function runLLMSCheck(checkDir) {
  let hasError = false;

  console.log('🔍 检查 llms.txt...\n');

  // 1. 主文件
  const mainFile = path.join(checkDir, 'llms.txt');
  const mainIssues = checkLLMsFile(mainFile);
  if (mainIssues.length > 0) {
    hasError = true;
    for (const issue of mainIssues) {
      console.log(`  ${issue}`);
    }
  } else {
    console.log('  ✅ llms.txt 格式正确');
  }

  // 2. 检查至少一个语言版本文件
  const localeFile = path.join(checkDir, 'llms-en.txt');
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

  // 3. 检查 llms-ctx.txt
  const ctxFile = path.join(checkDir, 'llms-ctx.txt');
  if (fs.existsSync(ctxFile)) {
    const ctxContent = fs.readFileSync(ctxFile, 'utf-8');
    if (ctxContent.length < 1000) {
      hasError = true;
      console.log('  ❌ llms-ctx.txt 过短');
    } else {
      console.log(`  ✅ llms-ctx.txt (${(ctxContent.length / 1024).toFixed(0)}KB)`);
    }
  }

  // 4. 检查语言版本文件数
  const allLangFiles = fs.readdirSync(checkDir).filter(f => /^llms-[a-z]{2}\.txt$/.test(f));
  console.log(`\n  ${allLangFiles.length}/${48} 语言版本文件存在`);

  if (hasError) {
    console.log('\n❌ llms.txt 检查未通过');
  } else {
    console.log('\n✅ llms.txt 全部检查通过');
  }

  return hasError ? 1 : 0;
}

// ── CLI Main ───────────────────────────────────────

// 仅在直接作为脚本运行时才解析 CLI 参数
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const isCi = args.includes('--ci');
  const dirArg = args.find(a => a.startsWith('--dir='));
  const dir = dirArg ? dirArg.split('=')[1] : path.resolve(process.cwd(), 'public');

  const issues = runLLMSCheck(dir);
  if (isCi && issues > 0) process.exit(1);
}
