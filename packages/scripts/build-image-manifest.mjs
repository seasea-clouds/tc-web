#!/usr/bin/env node
/**
 * build-image-manifest.mjs — 为博客图片生成「路径 → 宽高」清单
 *
 * 为什么需要：正文图由 markdown 渲染成 <img>，构建期拿不到图片尺寸，
 * 浏览器就无法预留空间 → 图片加载时页面跳动（CLS，Google 页面体验排名因素）。
 * 生成清单后，渲染时直接写 width/height，浏览器按比例预留高度。
 *
 * 只读 WebP 文件头（VP8 / VP8L / VP8X 三种容器格式），不引入依赖。
 *
 * 用法: node build-image-manifest.mjs
 * 产物: apps/insights/src/lib/image-manifest.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const IMAGES_DIR = path.join(ROOT, 'apps/insights/public/images/insights');
const OUT_FILE = path.join(ROOT, 'apps/insights/src/lib/image-manifest.json');

/** 读 WebP 文件头拿宽高；无法识别返回 null。 */
function webpSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fmt = buf.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') {
    // 有损：帧头里 14 bit 宽 + 14 bit 高
    return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  if (fmt === 'VP8L') {
    // 无损：14 bit (width-1) + 14 bit (height-1)，从第 21 字节起
    const bits = buf.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (fmt === 'VP8X') {
    // 扩展：24 bit (width-1) + 24 bit (height-1)
    const w = buf.readUIntLE(24, 3) + 1;
    const h = buf.readUIntLE(27, 3) + 1;
    return [w, h];
  }
  return null;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.webp$/i.test(entry.name)) acc.push(full);
  }
  return acc;
}

export function buildImageManifest() {
  const files = walk(IMAGES_DIR).sort();
  const manifest = {};
  let skipped = 0;
  for (const file of files) {
    const size = webpSize(file);
    if (!size) {
      skipped += 1;
      continue;
    }
    const rel = '/images/insights/' + path.relative(IMAGES_DIR, file).split(path.sep).join('/');
    manifest[rel] = size;
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`✅ image-manifest.json (${Object.keys(manifest).length} images${skipped ? `, ${skipped} skipped` : ''})`);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildImageManifest();
}
