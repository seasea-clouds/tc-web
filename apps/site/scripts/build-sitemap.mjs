/**
 * Generate per-locale sitemaps + sitemap index.
 * 
 * Splits into 48 locale-specific files (e.g. sitemap-en.xml) to avoid 
 * content negotiation issues with Cloudflare Pages on large single XML files.
 * 
 * Run after `next build` as a post-build step.
 * Usage: node scripts/build-sitemap.mjs
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://sinotradecompliance.com';
const ROOT = process.cwd();

const locales = [
  'en', 'zh', 'es', 'fr', 'de', 'ja', 'pt', 'ru',
  'ar', 'ko', 'it', 'nl', 'tr', 'vi', 'id', 'th',
  'hi', 'pl', 'sv', 'el', 'cs', 'ro', 'hu', 'fi',
  'da', 'no', 'uk', 'bg', 'hr', 'sr', 'sk', 'sl',
  'ms', 'ka', 'he', 'sw', 'bn', 'ca',
  'fa', 'ur', 'ta', 'af', 'sq', 'az', 'hy', 'be', 'ne', 'si',
];

const routes = [
  { path: '/', priority: 1.0 },
  { path: '/about/', priority: 0.7 },
  { path: '/services/', priority: 0.8 },
  { path: '/services/gacc/', priority: 0.8 },
  { path: '/services/label/', priority: 0.8 },
  { path: '/services/ccc/', priority: 0.8 },
  { path: '/services/cosmetics/', priority: 0.8 },
  { path: '/services/ecommerce/', priority: 0.8 },
  { path: '/services/brand/', priority: 0.8 },
  { path: '/packages/', priority: 0.8 },
  { path: '/faq/', priority: 0.7 },
  { path: '/thank-you/', priority: 0.3 },
];

function generateSitemaps() {
  const now = new Date().toISOString();

  // 1. Generate per-locale sitemaps
  const localeFiles = [];
  for (const locale of locales) {
    const filename = `sitemap-${locale}.xml`;
    localeFiles.push(filename);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const route of routes) {
      const loc = `${BASE_URL}/${locale}${route.path}`;
      xml += '  <url>\n';
      xml += `    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      for (const altLocale of locales) {
        if (altLocale === locale) continue;
        const altUrl = `${BASE_URL}/${altLocale}${route.path}`;
        const lang = altLocale === 'zh' ? 'zh-CN' : altLocale;
        xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${altUrl}"/>\n`;
      }
      xml += '  </url>\n';
    }
    xml += '</urlset>\n';

    writeFileSync(join(ROOT, 'out', filename), xml, 'utf8');
    writeFileSync(join(ROOT, 'public', filename), xml, 'utf8');
  }
  console.log(`✅ ${locales.length} locale sitemaps generated (out/ + public/)`);

  // 2. Generate sitemap index (references all locale sitemaps + image sitemap)
  let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  indexXml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const filename of localeFiles) {
    indexXml += `  <sitemap><loc>${BASE_URL}/${filename}</loc><lastmod>${now}</lastmod></sitemap>\n`;
  }
  indexXml += `  <sitemap><loc>${BASE_URL}/sitemap-images.xml</loc><lastmod>${now}</lastmod></sitemap>\n`;
  indexXml += '</sitemapindex>\n';

  writeFileSync(join(ROOT, 'out', 'sitemap.xml'), indexXml, 'utf8');
  writeFileSync(join(ROOT, 'public', 'sitemap.xml'), indexXml, 'utf8');
  console.log('✅ sitemap index written (out/ + public/)');
}

generateSitemaps();
