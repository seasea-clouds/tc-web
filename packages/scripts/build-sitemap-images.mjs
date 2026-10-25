#!/usr/bin/env node
/**
 * build-sitemap-images.mjs - 生成图片站地图
 *
 * 规则：
 *   - 图片 sitemap 的 <loc> 必须是**所在页面**的 URL，图片通过 <image:image> 挂上去。
 *     （旧版把图片 URL 直接当 <loc>，等于告诉 Google 这些是页面 → 全部无效条目）
 *   - 域名统一用主域：博客图片由 site 边缘 Worker 代理（/images/blog/* → blog 上游），
 *     子站域名 blog.sinotradecompliance.com 没有 DNS 记录，用它就是死链。
 *   - 只为「有对应文章页」的图片生成条目；站点装饰图（og-image、logo）不进图片 sitemap。
 *
 * 用法: node build-sitemap-images.mjs --base-url=https://sinotradecompliance.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/** Collect /images/blog/<slug>/<file>.webp → { slug: [file, …] } */
function collectBlogImages() {
  const root = path.join(ROOT, 'apps/blog/public/images/blog');
  const bySlug = new Map();
  if (!fs.existsSync(root)) return bySlug;

  for (const slug of fs.readdirSync(root)) {
    const dir = path.join(root, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f)).sort();
    if (files.length > 0) bySlug.set(slug, files);
  }
  return bySlug;
}

export function generateImageSitemap(baseUrl, outDir) {
  const base = baseUrl.replace(/\/$/, '');
  const bySlug = collectBlogImages();
  const now = new Date().toISOString();

  // 图片挂在英文文章页上：其余 47 个语言页共享同一批图片文件，
  // 让每个语言页都列一遍只会重复，不增加覆盖。
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  let count = 0;
  for (const [slug, files] of [...bySlug.entries()].sort()) {
    const pageUrl = `${base}/en/blog/${slug}/`;
    xml += `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${now}</lastmod>\n`;
    for (const file of files) {
      xml += `    <image:image>\n      <image:loc>${base}/images/blog/${slug}/${file}</image:loc>\n    </image:image>\n`;
      count += 1;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  fs.writeFileSync(path.join(outDir, 'sitemap-images.xml'), xml, 'utf-8');
  console.log(`✅ sitemap-images.xml (${bySlug.size} pages, ${count} images)`);
}

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { 'base-url': baseUrl } = parseArgs();
  if (!baseUrl) { console.error('Usage: --base-url=...'); process.exit(1); }
  generateImageSitemap(baseUrl, process.cwd());
}
