#!/usr/bin/env node
/**
 * build-sitemap.mjs - 生成统一多语言 sitemap
 * 
 * 生成结构:
 *   sitemap.xml           → 总索引（引用各语言 sitemap）
 *   sitemap-{locale}.xml  → 各语言站地图（48个）
 *   sitemap-images.xml    → 图片站地图
 * 
 * 用法: node build-sitemap.mjs --base-url=https://sinotradecompliance.com
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { discoverAll, expandLocales, LOCALES } from './discover-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateSitemaps(baseUrl, outDir) {
  const apps = discoverAll();
  const localeRoutes = expandLocales(apps);

  const now = new Date();

  // 1. 生成各语言 sitemap
  for (const { locale, routes } of localeRoutes) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const route of routes) {
      const loc = `${baseUrl}${route}`;
      xml += `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${now.toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    xml += `</urlset>\n`;
    fs.writeFileSync(path.join(outDir, `sitemap-${locale}.xml`), xml, 'utf-8');
  }

  console.log(`✅ ${localeRoutes.length} locale sitemaps generated`);

  // 2. 生成 sitemap index
  let idxXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  idxXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const { locale } of localeRoutes) {
    
    idxXml += `  <sitemap>\n    <loc>${baseUrl}/sitemap-${locale}.xml</loc>\n    <lastmod>${now.toISOString()}</lastmod>\n  </sitemap>\n`;
  }
  idxXml += `  <sitemap>\n    <loc>${baseUrl}/sitemap-images.xml</loc>\n    <lastmod>${now.toISOString()}</lastmod>\n  </sitemap>\n`;
  idxXml += `</sitemapindex>\n`;

  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), idxXml, 'utf-8');
  console.log('✅ sitemap.xml index generated');
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { 'base-url': baseUrl } = parseArgs();
  if (!baseUrl) {
    console.error('Usage: node build-sitemap.mjs --base-url=https://sinotradecompliance.com');
    process.exit(1);
  }
  generateSitemaps(baseUrl, process.cwd());
  console.log(`\n✅ Sitemaps written to ${process.cwd()}/`);
}
