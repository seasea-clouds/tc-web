#!/usr/bin/env node
/**
 * sync-icons.mjs — 统一站点图标同步脚本
 *
 * 唯一真源：packages/brand/
 *   - icon.png       512×512 透明 PNG（浏览器 favicon + apple-touch-icon）
 *   - favicon.ico    多尺寸 ICO（16/32/48/64/128/256）
 *
 * 同步目标：各 Next.js 项目的 public/ 根目录
 *   - apps/site/public/icon.png + favicon.ico
 *   - apps/portal/public/icon.png + favicon.ico
 *   - apps/blog/public/icon.png + favicon.ico
 *   - apps/admin/public/icon.png + favicon.ico
 *
 * 同时清理各项目 src/app/ 下的旧约定文件（favicon.ico / icon.png），
 * 避免 Next.js 同时输出带 hash 与不带 hash 的重复引用。
 *
 * 用法：node packages/scripts/sync-icons.mjs [--dry-run]
 */
import { copyFileSync, existsSync, rmSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const BRAND_DIR = path.join(REPO_ROOT, 'packages', 'brand');
const APPS = ['site', 'portal', 'blog', 'admin'];
const FILES = ['icon.png', 'favicon.ico'];
const STALE_APP_FILES = ['favicon.ico', 'icon.png']; // src/app 下要清理的旧约定文件

const dryRun = process.argv.includes('--dry-run');

function main() {
  // 校验真源存在
  for (const f of FILES) {
    const p = path.join(BRAND_DIR, f);
    if (!existsSync(p)) {
      console.error(`✘ 真源缺失: ${p}`);
      process.exit(1);
    }
  }

  console.log(`同步站点图标（真源: packages/brand/）${dryRun ? '[dry-run]' : ''}\n`);

  for (const app of APPS) {
    const publicDir = path.join(REPO_ROOT, 'apps', app, 'public');
    const appDir = path.join(REPO_ROOT, 'apps', app, 'src', 'app');

    console.log(`--- apps/${app} ---`);

    // 1. 同步到 public/
    if (!existsSync(publicDir)) {
      if (dryRun) {
        console.log('  [mkdir] public/');
      } else {
        mkdirSync(publicDir, { recursive: true });
        console.log('  ✓ 创建 public/');
      }
    }
    for (const f of FILES) {
      const src = path.join(BRAND_DIR, f);
      const dest = path.join(publicDir, f);
      const size = (fsSize(src) / 1024).toFixed(1);
      if (dryRun) {
        console.log(`  [sync] ${f} (${size} KB) → public/`);
      } else {
        copyFileSync(src, dest);
        console.log(`  ✓ ${f} (${size} KB) → public/`);
      }
    }

    // 2. 清理 src/app/ 下的旧约定文件（仅当存在时）
    if (existsSync(appDir)) {
      for (const f of STALE_APP_FILES) {
        const p = path.join(appDir, f);
        if (existsSync(p)) {
          if (dryRun) {
            console.log(`  [clean] 删除 src/app/${f}`);
          } else {
            rmSync(p);
            console.log(`  ✗ 删除 src/app/${f}（旧约定文件，已由 public/ 统一接管）`);
          }
        }
      }
    }
    console.log('');
  }

  console.log(dryRun ? '（dry-run，未做任何修改）' : '✅ 同步完成');
}

function fsSize(p) {
  return statSync(p).size;
}

main();
