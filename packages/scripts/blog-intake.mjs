#!/usr/bin/env node
/**
 * blog-intake.mjs — 博客投稿包入库
 *
 * 用法：
 *   node packages/scripts/blog-intake.mjs <package.zip>            # 只检查（默认）
 *   node packages/scripts/blog-intake.mjs <package.zip> --write    # 检查通过后写入仓库
 *   node packages/scripts/blog-intake.mjs <package.zip> --write --force   # 覆盖同 slug
 *
 * 职责：
 *   1. 解压到临时目录
 *   2. 调用 docs/blog-submission/submitter_check.py（唯一规则来源，作者端同一套）
 *   3. 仓库侧补充校验：slug 是否重复、分类标签是否 48 语言齐备
 *   4. --write 时把 content/<lang>/<slug>.mdx 与 images/<slug>/* 直接落盘
 *
 * 不做任何内容改写。落盘后仍需跑 CI + build 才能上线。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const checker = path.join(repoRoot, 'docs/blog-submission/submitter_check.py');
const blogRoot = path.join(repoRoot, 'apps/blog');
const contentRoot = path.join(blogRoot, 'content');
const imagesRoot = path.join(blogRoot, 'public/images/blog');
// 生产域是 site（sinotradecompliance.com），/blog 只是边缘代理；
// 正文图片走站点根路径 /images/...，因此 site 的 public 也必须有一份。
const siteImagesRoot = path.join(repoRoot, 'apps/site/public/images/blog');
const locales = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/ui/locales.json'), 'utf8'));

const args = process.argv.slice(2);
const zipPath = args.find((a) => !a.startsWith('--'));
const doWrite = args.includes('--write');
const force = args.includes('--force');

if (!zipPath) {
  console.error('用法: node packages/scripts/blog-intake.mjs <package.zip> [--write] [--force]');
  process.exit(2);
}
const absZip = path.resolve(zipPath);
if (!fs.existsSync(absZip)) {
  console.error(`✗ 找不到文件: ${absZip}`);
  process.exit(2);
}

const python = (() => {
  for (const bin of ['python3', '/root/.venv/bin/python']) {
    try {
      execFileSync(bin, ['-V'], { stdio: 'ignore' });
      return bin;
    } catch {
      /* next */
    }
  }
  console.error('✗ 找不到 python3（入库脚本需要它跑规则检查）');
  process.exit(2);
})();

// ---------------------------------------------------------------- 1. 解压

const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-intake-'));
console.log(`▶ 解压到 ${workRoot}`);
execFileSync(python, ['-m', 'zipfile', '-e', absZip, workRoot], { stdio: 'inherit' });

// ---------------------------------------------------------------- 2. 规则检查

console.log('▶ 运行规则检查（与投稿者自检同一套脚本）');
let report;
try {
  const out = execFileSync(python, [checker, absZip, '--json'], { encoding: 'utf8' });
  report = JSON.parse(out);
} catch (err) {
  // exit code 1 时 stdout 仍带 JSON
  const out = String(err.stdout || '');
  try {
    report = JSON.parse(out);
  } catch {
    console.error('✗ 检查脚本执行失败');
    console.error(String(err.stderr || err.message));
    process.exit(1);
  }
}

const errors = (report.findings || []).filter((f) => f.severity === 'error');
const warnings = (report.findings || []).filter((f) => f.severity === 'warning');

for (const f of errors) console.log(`  ✗ [${f.rule}] ${f.article}  ${f.detail}`);
for (const f of warnings) console.log(`  ! [${f.rule}] ${f.article}  ${f.detail}`);

if (errors.length) {
  console.error(`\n✗ 未通过：${errors.length} 项 error —— 退回投稿者修改（本站不做内容润色）`);
  fs.rmSync(workRoot, { recursive: true, force: true });
  process.exit(1);
}
console.log(`✓ 规则检查通过（0 error, ${warnings.length} warning）`);

// ---------------------------------------------------------------- 3. 仓库侧校验

const articlesDir = path.join(workRoot, 'articles');
const slugs = fs.existsSync(articlesDir)
  ? fs.readdirSync(articlesDir).filter((d) => fs.statSync(path.join(articlesDir, d)).isDirectory())
  : [];

const repoProblems = [];
const categories = new Set();

for (const slug of slugs) {
  const subFile = path.join(articlesDir, slug, 'submission.json');
  const meta = JSON.parse(fs.readFileSync(subFile, 'utf8'));
  categories.add(meta.category);
  if (fs.existsSync(path.join(contentRoot, 'en', `${slug}.mdx`)) && !force) {
    repoProblems.push(`slug 已存在：content/en/${slug}.mdx（如确需替换加 --force）`);
  }
  for (const lang of locales) {
    const src = path.join(articlesDir, slug, 'content', lang, `${slug}.mdx`);
    if (!fs.existsSync(src)) {
      repoProblems.push(`${slug}: 包内缺少 content/${lang}/${slug}.mdx`);
    }
  }
}

for (const cat of categories) {
  const key =
    'cat_' + cat.replace(/-/g, '_').replace(/ & /g, '_').replace(/ /g, '_');
  for (const lang of locales) {
    const msgFile = path.join(blogRoot, 'messages', `${lang}.json`);
    const msg = JSON.parse(fs.readFileSync(msgFile, 'utf8'));
    if (!(key in (msg.Blog || {}))) {
      repoProblems.push(`分类标签缺失：messages/${lang}.json 没有 Blog.${key}`);
    }
  }
}

if (repoProblems.length) {
  for (const p of repoProblems) console.error(`  ✗ ${p}`);
  console.error('\n✗ 仓库侧校验未通过');
  if (!doWrite) fs.rmSync(workRoot, { recursive: true, force: true });
  process.exit(1);
}

// ---------------------------------------------------------------- 4. 写入

if (!doWrite) {
  console.log('\n✓ 全部校验通过（未写入）。确认无误后加 --write 落盘。');
  console.log(`  临时目录：${workRoot}`);
  process.exit(0);
}

let written = 0;
for (const slug of slugs) {
  const artDir = path.join(articlesDir, slug);
  for (const lang of locales) {
    const src = path.join(artDir, 'content', lang, `${slug}.mdx`);
    const dst = path.join(contentRoot, lang, `${slug}.mdx`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    written++;
  }
  const imgSrc = path.join(artDir, 'images', slug);
  if (fs.existsSync(imgSrc)) {
    for (const root of [imagesRoot, siteImagesRoot]) {
      const imgDst = path.join(root, slug);
      fs.mkdirSync(imgDst, { recursive: true });
      for (const f of fs.readdirSync(imgSrc)) {
        fs.copyFileSync(path.join(imgSrc, f), path.join(imgDst, f));
      }
    }
  }
  console.log(`✓ ${slug}: 48 语言 + ${fs.existsSync(imgSrc) ? fs.readdirSync(imgSrc).length : 0} 张图`);
}

fs.rmSync(workRoot, { recursive: true, force: true });
console.log(`\n✓ 已写入 ${written} 个 mdx 文件`);
console.log('\n下一步（不可跳过）:');
console.log('  1) node packages/scripts/check-md-article.mjs --ci');
console.log('  2) npx turbo build --force');
console.log('  3) git add -A && git commit -m "blog: <slug>" && git push');
console.log('  4) 部署完成后逐语言验证 /<lang>/blog/<slug>/');
