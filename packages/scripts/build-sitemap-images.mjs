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
 *   - **每个语言页各列一次**（v2）：同一张图片文件出现在 48 个语言页上，
 *     Google 的语义是「这张图在这个页面上」，德语图片搜索要关联德语页，
 *     只挂在 /en/ 等于放弃其余 47 个语言的图片入口。
 *   - 附带 <image:title>：取该语言正文里的 alt（Google 支持，提升图片搜索表现）。
 *
 * 用法: node build-sitemap-images.mjs --base-url=https://sinotradecompliance.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CONTENT_DIR = path.join(ROOT, 'apps/blog/content');
const IMAGES_DIR = path.join(ROOT, 'apps/blog/public/images/blog');
const LOCALES_FILE = path.join(ROOT, 'packages/ui/locales.json');

/** /images/blog/<slug>/<file>.webp → { slug: [file, …] }（只收实际存在的文件） */
function collectBlogImages() {
  const bySlug = new Map();
  if (!fs.existsSync(IMAGES_DIR)) return bySlug;
  for (const slug of fs.readdirSync(IMAGES_DIR)) {
    const dir = path.join(IMAGES_DIR, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f)).sort();
    if (files.length > 0) bySlug.set(slug, files);
  }
  return bySlug;
}

/** 该语言正文里 <file> 对应的 alt 文本（找不到返回空串） */
function altFor(contentText, slug, file) {
  const re = new RegExp(`!\\[([^\\]]*)\\]\\(/images/blog/${slug}/${file.replace(/\./g, '\\.')}\\)`);
  const m = contentText.match(re);
  return m ? m[1].trim() : '';
}

const xmlEscape = s => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export function generateImageSitemap(baseUrl, outDir) {
  const base = baseUrl.replace(/\/$/, '');
  const bySlug = collectBlogImages();
  const locales = JSON.parse(fs.readFileSync(LOCALES_FILE, 'utf-8'));
  const now = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  let pageCount = 0;
  let imageCount = 0;
  for (const locale of locales) {
    for (const [slug, files] of [...bySlug.entries()].sort()) {
      const contentFile = path.join(CONTENT_DIR, locale, `${slug}.mdx`);
      const contentText = fs.existsSync(contentFile) ? fs.readFileSync(contentFile, 'utf-8') : '';
      // 该语言没有这篇（或没挂图）就跳过——不产生空条目
      const present = files.filter(f => contentText.includes(`/images/blog/${slug}/${f}`));
      if (present.length === 0) continue;

      xml += `  <url>\n    <loc>${base}/${locale}/insights/${slug}/</loc>\n    <lastmod>${now}</lastmod>\n`;
      for (const file of present) {
        const alt = altFor(contentText, slug, file).slice(0, 120);
        xml += `    <image:image>\n      <image:loc>${base}/images/blog/${slug}/${file}</image:loc>\n`;
        if (alt) xml += `      <image:title>${xmlEscape(alt)}</image:title>\n`;
        xml += `    </image:image>\n`;
        imageCount += 1;
      }
      xml += `  </url>\n`;
      pageCount += 1;
    }
  }

  xml += `</urlset>\n`;
  fs.writeFileSync(path.join(outDir, 'sitemap-images.xml'), xml, 'utf-8');
  const kb = Math.round(fs.statSync(path.join(outDir, 'sitemap-images.xml')).size / 1024);
  console.log(`✅ sitemap-images.xml (${pageCount} pages, ${imageCount} images, ${kb} KB)`);
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
