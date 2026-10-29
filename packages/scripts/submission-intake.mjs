#!/usr/bin/env node
/**
 * submission-intake.mjs — 投稿包入库（博客文章 + 法规文章共用一套）
 *
 * 用法：
 *   node packages/scripts/submission-intake.mjs <package.zip>                     # 只检查
 *   node packages/scripts/submission-intake.mjs <package.zip> --write             # 检查通过后写入
 *   node packages/scripts/submission-intake.mjs <package.zip> --write --force     # 覆盖同 slug
 *   node packages/scripts/submission-intake.mjs <package.zip> --write --force --keep-date
 *       替换已上线文章时保留仓库里的原日期（只换内容），忽略包内 date
 *   node packages/scripts/submission-intake.mjs <package.zip> --write --date=2026-11-03
 *       强制指定发布日期（定时发布排期用）
 *
 * 类型判定：读 submission.json 的 `kind` 字段（"blog" 默认 / "regulation"），
 * 决定落盘到 apps/blog 还是 apps/regulations。两类共用同一个检查脚本
 * （docs/submission-kit/submitter_check.py），站方不回改内容。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const checker = path.join(repoRoot, 'docs/submission-kit/submitter_check.py');

const TARGETS = {
  blog: {
    app: 'blog',
    contentRoot: path.join(repoRoot, 'apps/blog/content'),
    imagesRoot: path.join(repoRoot, 'apps/blog/public/images/blog'),
  },
  regulation: {
    app: 'regulations',
    contentRoot: path.join(repoRoot, 'apps/regulations/content'),
    imagesRoot: null, // 法规按约定不使用配图
  },
};

const locales = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/ui/locales.json'), 'utf8'));

const args = process.argv.slice(2);
const zipPath = args.find((a) => !a.startsWith('--'));
const doWrite = args.includes('--write');
const force = args.includes('--force');
const keepDate = args.includes('--keep-date');
const forcedDate = (args.find((a) => a.startsWith('--date=')) || '').split('=')[1] || '';

if (!zipPath) {
  console.error('用法: node packages/scripts/submission-intake.mjs <package.zip> [--write] [--force] [--keep-date] [--date=YYYY-MM-DD]');
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

const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'submission-intake-'));
console.log(`▶ 解压到 ${workRoot}`);
execFileSync(python, ['-m', 'zipfile', '-e', absZip, workRoot], { stdio: 'inherit' });

// ---------------------------------------------------------------- 2. 规则检查

console.log('▶ 运行规则检查（与投稿者自检同一套脚本）');
let report;
try {
  const out = execFileSync(python, [checker, absZip, '--json'], { encoding: 'utf8' });
  report = JSON.parse(out);
} catch (err) {
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

// 包内两种布局都收（与 submitter_check.py 一致）：
//   articles/<slug>/                  交付格式，kind 由 submission.json 决定
//   blog/<slug>/ + regulation/<slug>/ 分类格式，目录即类型声明
const layoutDirs = [
  { dir: 'articles', expected: null },
  { dir: 'blog', expected: 'blog' },
  { dir: 'regulation', expected: 'regulation' },
];
const entries = [];
for (const { dir, expected } of layoutDirs) {
  const abs = path.join(workRoot, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    if (!fs.statSync(path.join(abs, name)).isDirectory()) continue;
    entries.push({ slug: name, artDir: path.join(abs, name), expected });
  }
}
const dup = entries.map((e) => e.slug).filter((s, i, a) => a.indexOf(s) !== i);
const repoProblems = [...new Set(dup)].map((s) => `${s}: 同一包里 slug 重复`);
const items = [];

for (const { slug, artDir, expected } of entries) {
  const meta = JSON.parse(fs.readFileSync(path.join(artDir, 'submission.json'), 'utf8'));
  const kindVal = String(meta.kind || '').trim().toLowerCase();
  if (kindVal !== 'blog' && kindVal !== 'regulation') {
    repoProblems.push(`${slug}: submission.json 的 kind 必须是 "blog" 或 "regulation"（当前 ${JSON.stringify(meta.kind)}）`);
    continue;
  }
  if (expected && kindVal !== expected) {
    repoProblems.push(`${slug}: 放在 ${expected}/ 目录下但 kind 是 "${kindVal}"（应为 "${expected}"）`);
    continue;
  }
  const kind = kindVal;
  const target = TARGETS[kind];
  const dstEn = path.join(target.contentRoot, 'en', `${slug}.mdx`);
  const exists = fs.existsSync(dstEn);

  if (exists && !force) {
    repoProblems.push(`${slug} 已存在（${kind}）: ${path.relative(repoRoot, dstEn)}（替换请加 --force）`);
  }
  for (const lang of locales) {
    const src = path.join(artDir, 'content', lang, `${slug}.mdx`);
    if (!fs.existsSync(src)) repoProblems.push(`${slug}: 包内缺少 content/${lang}/${slug}.mdx`);
  }

  // 替换场景：保留仓库原日期
  let date = meta.date;
  if (keepDate && exists) {
    const m = fs.readFileSync(dstEn, 'utf8').match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m);
    if (m) date = m[1];
  }
  if (forcedDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(forcedDate)) repoProblems.push(`--date 格式应为 YYYY-MM-DD`);
    else date = forcedDate;
  }
  if (keepDate && !exists) {
    repoProblems.push(`${slug}: --keep-date 只能用于替换已存在的文章（新文章请给 --date）`);
  }

  // 博客：分类标签必须 48 语言齐（法规用 category 但列表页按服务/机关筛，不需要 Blog.cat_*）
  if (kind === 'blog') {
    const key = 'cat_' + String(meta.category || '').replace(/-/g, '_').replace(/ & /g, '_').replace(/ /g, '_');
    for (const lang of locales) {
      const msg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/blog/messages', `${lang}.json`), 'utf8'));
      if (!(key in (msg.Blog || {}))) {
        repoProblems.push(`分类标签缺失：apps/blog/messages/${lang}.json 没有 Blog.${key}`);
        break;
      }
    }
  }

  items.push({ slug, kind, target, artDir, date, exists, meta });
}

if (repoProblems.length) {
  for (const p of repoProblems) console.error(`  ✗ ${p}`);
  console.error('\n✗ 仓库侧校验未通过');
  fs.rmSync(workRoot, { recursive: true, force: true });
  process.exit(1);
}

for (const it of items) {
  console.log(
    `  ${it.kind === 'regulation' ? '法规' : '博客'} ${it.slug}  date=${it.date}${it.exists ? '  (替换)' : '  (新增)'}`,
  );
}

// ---------------------------------------------------------------- 4. 写入

if (!doWrite) {
  console.log('\n✓ 全部校验通过（未写入）。确认无误后加 --write 落盘。');
  console.log(`  临时目录：${workRoot}`);
  process.exit(0);
}

let written = 0;
for (const it of items) {
  const { slug, artDir, target, date } = it;
  const dateChanged = date !== it.meta.date;
  for (const lang of locales) {
    const src = path.join(artDir, 'content', lang, `${slug}.mdx`);
    const dst = path.join(target.contentRoot, lang, `${slug}.mdx`);
    let body = fs.readFileSync(src, 'utf8');
    if (dateChanged) {
      body = body.replace(/^date:\s*("?)[0-9]{4}-[0-9]{2}-[0-9]{2}\1/m, `date: "${date}"`);
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, body);
    written++;
  }
  // 法规的图片不使用；博客照常同步
  const imgSrc = path.join(artDir, 'images', slug);
  let imgCount = 0;
  if (target.imagesRoot && fs.existsSync(imgSrc)) {
    const imgDst = path.join(target.imagesRoot, slug);
    fs.mkdirSync(imgDst, { recursive: true });
    for (const f of fs.readdirSync(imgSrc)) {
      fs.copyFileSync(path.join(imgSrc, f), path.join(imgDst, f));
      imgCount++;
    }
  }
  console.log(`✓ ${slug}: 48 语言${imgCount ? ` + ${imgCount} 张图` : ''}${dateChanged ? `  日期 → ${date}` : ''}`);
}

fs.rmSync(workRoot, { recursive: true, force: true });
console.log(`\n✓ 已写入 ${written} 个 mdx 文件`);
console.log('\n下一步（不可跳过）:');
console.log('  1) node packages/scripts/check-md-article.mjs --ci');
console.log('  2) npx turbo build --force');
console.log('  3) git add -A && git commit && git push');
console.log('  4) 部署完成后逐语言验证 /<lang>/blog/<slug>/');
