#!/usr/bin/env node
/**
 * build-all.mjs - 主站统一编译总入口
 * 
 * 用法: node packages/scripts/build-all.mjs --base-url=https://sinotradecompliance.com [--out-dir=out]
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

async function main() {
  const { 'base-url': baseUrl, 'out-dir': outDirArg } = parseArgs();
  if (!baseUrl) {
    console.error('Usage: node build-all.mjs --base-url=https://sinotradecompliance.com [--out-dir=out]');
    process.exit(1);
  }

  const cwd = process.cwd();
  const outDir = outDirArg ? path.resolve(cwd, outDirArg) : path.join(cwd, 'out');

  console.log('=== build-all.mjs ===');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Output:   ${outDir}`);
  console.log('');

  fs.mkdirSync(outDir, { recursive: true });

  // 0. Domain hardcoding check
  console.log('[0/7] Checking for hardcoded dev domains...');
  const { runDomainCheck } = await import(path.join(__dirname, 'check-hardcoded-domain.mjs'));
  const domainIssues = runDomainCheck();
  if (domainIssues > 0) {
    console.error(`❌ 发现 ${domainIssues} 处硬编码域名`);
    process.exit(1);
  }
  console.log('  ✅ 域名检查通过');

  // 1. Sitemaps
  console.log('[1/7] Generating sitemaps...');
  const { generateSitemaps } = await import(path.join(__dirname, 'build-sitemap.mjs'));
  generateSitemaps(baseUrl, outDir);

  // 2. Image sitemap
  console.log('[2/5] Generating image sitemap...');
  const { generateImageSitemap } = await import(path.join(__dirname, 'build-sitemap-images.mjs'));
  generateImageSitemap(baseUrl, outDir);

  // 3. LLM files
  console.log('[3/5] Generating LLM files...');
  const { buildLLMs } = await import(path.join(__dirname, 'build-llms.mjs'));
  buildLLMs(baseUrl, outDir);

  // 4. Search indexes — skipped, generated pre-build by apps/site/scripts/build-search-index.mjs
  console.log('[4/7] Search indexes — skipped (pre-build)');

  // 5. robots.txt
  console.log('[5/7] Generating robots.txt...');
  const { generateRobots } = await import(path.join(__dirname, 'build-robots.mjs'));
  generateRobots(baseUrl, outDir);

  // 6. Check llms.txt quality
  console.log('[6/7] Checking llms.txt quality...');
  const { runLLMSCheck } = await import(path.join(__dirname, 'check-llms.mjs'));
  const llmIssues = runLLMSCheck(outDir);
  if (llmIssues > 0) {
    console.error(`❌ llms.txt 检查发现 ${llmIssues} 项问题`);
    process.exit(1);
  }
  console.log('  ✅ llms.txt 检查通过');

  // 7. Copy to public/ for source control
  console.log('[7/7] Copying to public/...');
  const publicDir = path.join(cwd, 'public');
  if (fs.existsSync(publicDir)) {
    for (const f of fs.readdirSync(outDir)) {
      if (f.startsWith('sitemap') || f.startsWith('llms') || f.startsWith('search-index') || f === 'robots.txt') {
        fs.copyFileSync(path.join(outDir, f), path.join(publicDir, f));
      }
    }
  }

  console.log('\n✅ build-all.mjs complete');
}

main();