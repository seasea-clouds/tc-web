#!/usr/bin/env node
/**
 * check-hreflang.mjs — 统一 hreflang 检查脚本
 *
 * ⚠️ 项目选择指南：
 *   site  (SSG, 直接托管)    → --dir=out
 *   blog  (SSG, 直接托管)    → --next-dir=.next
 *   portal(SSG+Worker边缘路由) → --url=... 检查已部署实例
 *
 * Portal 的 hreflang 由 site 的 Cloudflare Worker 中间件在边缘端注入，
 * SSG 静态输出中不含 hreflang 标签，因此不能用 --dir=out 检查。
 * 必须部署后通过 --url 模式进行远程验证。
 *
 * 支持 3 种模式：
 *   --dir=out         → 扫描 SSG 输出目录（site）
 *   --next-dir=.next  → 扫描 Next.js build 输出（blog）
 *   --url=...         → curl 远程检查（portal 部署后）
 *
 * 用法:
 *   node check-hreflang.mjs --dir=out --ci       # site
 *   node check-hreflang.mjs --next-dir=.next --ci # blog
 *   node check-hreflang.mjs --url=https://sinotradecompliance.com/en/c/ --ci  # portal deploy
 *
 * 退出码: 0 通过, 1 失败
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const EXPECTED_MIN_LOCALES = 40; // 至少验证 40 个语言

// ── 检查模式 ──────────────────────────────────────

function checkDir(outDir) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) walk(fp);
      } else if (entry.name === 'index.html') {
        files.push(fp);
      }
    }
  }
  walk(outDir);
  return files;
}

function countHreflangInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Match both HTML <link> format (hreflang=) and RSC payload format (hrefLang=)
  const count = (content.match(/hreflang=|hrefLang=/g) || []).length;
  const hasXdefault = content.includes('x-default');
  return { count, hasXdefault };
}

function checkSSGOutput(dir, skipPatterns = []) {
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠️ 目录不存在: ${dir}`);
    return 1;
  }
  const files = checkDir(dir);
  console.log(`  📄 扫描 ${files.length} 个 HTML 文件\n`);

  let failures = 0;
  let passes = 0;
  let skipped = 0;
  for (const file of files) {
    const rel = path.relative(dir, file);
    
    // Skip files matching skip patterns (e.g., /c/ in portal SSG which gets Worker-level hreflang)
    // Pattern matching: remove leading / from pattern since rel is relative without leading /
    const normalizedPattern = (p) => {
      const clean = p.startsWith('/') ? p.slice(1) : p;
      return rel.includes(clean);
    };
    if (skipPatterns.some(normalizedPattern)) {
      skipped++;
      continue;
    }

    const { count, hasXdefault } = countHreflangInFile(file);
    
    if (count >= EXPECTED_MIN_LOCALES && hasXdefault) {
      passes++;
    } else {
      console.log(`  ❌ ${rel}: ${count} hreflang, x-default=${hasXdefault}`);
      failures++;
    }
  }

  console.log(`  跳过: ${skipped} 文件 (路径匹配 skip-pattern)`);
  console.log(`\n  结果: ${passes} 通过, ${failures} 失败`);
  return failures;
}

function checkNextDir(nextDir) {
  // 扫描 .next/server/app/ 下的博客页面
  const blogRoot = path.join(nextDir, 'server', 'app');
  if (!fs.existsSync(blogRoot)) {
    console.log(`  ⚠️ 目录不存在: ${blogRoot}`);
    return 1;
  }

  const blogFiles = [];
  function walk(dir, depth = 0) {
    if (depth > 4) return; // 限制深度
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fp, depth + 1);
      else if (entry.name.endsWith('.html') && !entry.name.startsWith('_')) {
        blogFiles.push(fp);
      }
    }
  }
  walk(blogRoot);

  console.log(`  📄 扫描 ${blogFiles.length} 个页面\n`);
  let failures = 0;
  for (const file of blogFiles) {
    const rel = path.relative(blogRoot, file);
    const { count, hasXdefault } = countHreflangInFile(file);
    
    // 检查涉及 /blog/ 路径的页面
    if (file.includes('/blog/') || rel.includes('/blog/')) {
      if (count >= EXPECTED_MIN_LOCALES) {
        console.log(`  ✅ ${rel}: ${count} hreflang`);
      } else {
        console.log(`  ❌ ${rel}: ${count} hreflang (期望 ≥${EXPECTED_MIN_LOCALES})`);
        failures++;
      }
    }
  }
  return failures;
}

async function checkRemoteUrl(url) {
  try {
    const resp = await fetch(url);
    const html = await resp.text();
    const count = (html.match(/hreflang=|hrefLang=/g) || []).length;
    const hasXdefault = html.includes('x-default');
    if (count >= 1 && hasXdefault) {
      console.log(`  ✅ ${url}: ${count} hreflang, x-default=${hasXdefault}`);
      return 0;
    } else {
      console.log(`  ❌ ${url}: ${count} hreflang, x-default=${hasXdefault}`);
      return 1;
    }
  } catch (err) {
    console.log(`  ❌ ${url}: 请求失败 - ${err.message}`);
    return 1;
  }
}

// ── Main ──────────────────────────────────────────

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const dirArg = args.find(a => a.startsWith('--dir='));
const nextDirArg = args.find(a => a.startsWith('--next-dir='));
const urlArg = args.find(a => a.startsWith('--url='));
const skipPatternArg = args.find(a => a.startsWith('--skip-pattern='));
const skipPatterns = skipPatternArg ? skipPatternArg.split('=')[1].split(',').filter(Boolean) : [];

console.log('🔍 统一 hreflang 检查\n');

let failures = 0;

if (dirArg) {
  console.log('📦 模式: SSG 输出目录检查');
  const dir = path.resolve(dirArg.split('=')[1]);
  failures += checkSSGOutput(dir, skipPatterns);
} else if (nextDirArg) {
  console.log('📦 模式: Next.js build 输出检查');
  failures += checkNextDir(path.resolve(nextDirArg.split('=')[1]));
} else if (urlArg) {
  console.log('📦 模式: 远程 URL 检查');
  failures += await checkRemoteUrl(urlArg);
} else {
  console.error('❌ 请指定检查模式: --dir=, --next-dir=, 或 --url=');
  process.exit(1);
}

if (failures > 0) {
  console.log(`\n❌ ${failures} 项检查未通过`);
  if (isCi) process.exit(1);
} else {
  console.log('\n✅ hreflang 全部检查通过');
}
