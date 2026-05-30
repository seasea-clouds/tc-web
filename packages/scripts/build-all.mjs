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

  // 1. Sitemaps
  console.log('[1/5] Generating sitemaps...');
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

  // 4. Search indexes
  console.log('[4/5] Generating search indexes...');
  const { buildSearchIndexes } = await import(path.join(__dirname, 'build-search-index.mjs'));
  buildSearchIndexes(baseUrl, outDir);

  // 5. robots.txt
  console.log('[5/5] Generating robots.txt...');
  const { generateRobots } = await import(path.join(__dirname, 'build-robots.mjs'));
  generateRobots(baseUrl, outDir);

  // 6. Also copy to public/ for source control
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