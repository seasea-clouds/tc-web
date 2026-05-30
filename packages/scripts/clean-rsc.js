#!/usr/bin/env node
/**
 * Clean up Next.js SSG RSC payload .txt files from out/ directory.
 * 
 * Next.js static export generates RSC payload files (*.txt) alongside
 * each HTML page. These are not needed for Cloudflare Pages deployment
 * and bloat the output from ~120MB to 1.2GB+.
 * 
 * Integrated into `npm run build` — runs after `next build`.
 */

import { readdirSync, statSync, rmSync } from 'fs';
import { join } from 'path';

const OUT_DIR = new URL('../out', import.meta.url).pathname;

let deletedCount = 0;
let totalSize = 0;

function cleanDir(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      cleanDir(fullPath);
    } else if (entry.endsWith('.txt') && !['robots.txt', 'llms.txt'].includes(entry) && !entry.startsWith('llms-')) {
      const size = stat.size;
      rmSync(fullPath);
      deletedCount++;
      totalSize += size;
    }
  }
}

console.log('🧹 Cleaning RSC .txt payload files from out/...');
cleanDir(OUT_DIR);

const mb = (totalSize / (1024 * 1024)).toFixed(1);
console.log(`✅ Deleted ${deletedCount} RSC payload files (${mb} MB freed)`);
