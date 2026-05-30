#!/usr/bin/env node
/**
 * build-sitemap-images.mjs - 生成统一图片站地图
 * 扫描所有子站的 public/images/ 目录
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function discoverImages(baseUrl) {
  const images = [];
  const appsDir = path.join(ROOT, 'apps');
  
  for (const app of fs.readdirSync(appsDir)) {
    const imgDir = path.join(appsDir, app, 'public', 'images');
    if (!fs.existsSync(imgDir)) continue;
    walkImages(imgDir, `https://${app}.sinotradecompliance.com/images/`, images);
  }
  return images;
}

function walkImages(dir, urlPrefix, result) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkImages(full, urlPrefix + entry.name + '/', result);
    else if (/\.(webp|jpg|jpeg|png|svg)$/i.test(entry.name)) {
      result.push(urlPrefix + entry.name);
    }
  }
}

function generateImageSitemap(baseUrl, outDir) {
  const images = discoverImages(baseUrl);
  const now = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  
  for (const img of images) {
    xml += `  <url>\n    <loc>${img}</loc>\n    <lastmod>${now}</lastmod>\n  </url>\n`;
  }
  
  xml += `</urlset>\n`;
  fs.writeFileSync(path.join(outDir, 'sitemap-images.xml'), xml, 'utf-8');
  console.log(`✅ sitemap-images.xml (${images.length} images)`);
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

export { generateImageSitemap, discoverImages };
