#!/usr/bin/env node
/**
 * check-hreflang-portal.mjs — Portal 部署后 hreflang 检查
 *
 * Portal 的 hreflang 由 site 的 Cloudflare Worker 在边缘端注入，
 * SSG 静态输出中不含 hreflang 标签，必须部署后远程验证。
 *
 * 自动检测 CF_PAGES_URL 环境变量（CF Pages 构建时自动设置），
 * 未设置时 fallback 到生产域名。
 *
 * 用法:
 *   node check-hreflang-portal.mjs --ci   # 失败时 exit 1
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseUrl = process.env.CF_PAGES_URL || 'https://sinotradecompliance.com';
const url = `${baseUrl}/en/c/`;
const isCi = process.argv.includes('--ci');

console.log(`🔍 Portal hreflang 检查`);
console.log(`   CF_PAGES_URL: ${process.env.CF_PAGES_URL || '(未设置, 使用生产域名)'}`);
console.log(`   检查 URL: ${url}\n`);

try {
  const result = execSync(
    `node "${path.resolve(__dirname, 'check-hreflang.mjs')}" --url="${url}"${isCi ? ' --ci' : ''}`,
    { stdio: 'inherit', cwd: __dirname }
  );
  process.exit(result.status ?? 0);
} catch (err) {
  // execSync throws on non-zero exit when using stdio: 'inherit' in older Node
  // But in Node 22 it should propagate. Handle both cases.
  process.exit(err.status ?? 1);
}
