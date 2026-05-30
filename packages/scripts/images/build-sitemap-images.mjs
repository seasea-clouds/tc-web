#!/usr/bin/env node
/**
 * Generate sitemap-images.xml with team photos and blog cover images.
 * Replaces scripts/images/build-sitemap.py — pure Node.js, no Python.
 */
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content', 'blog');
const OUT_DIR = path.join(PROJECT_ROOT, 'out');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const BASE_URL = 'https://sinotradecompliance.com';

const LOCALES = [
  'en', 'zh', 'es', 'fr', 'de', 'ja', 'pt', 'ru',
  'ar', 'ko', 'it', 'nl', 'tr', 'vi', 'id', 'th',
  'hi', 'pl', 'sv', 'el', 'cs', 'ro', 'hu', 'fi',
  'da', 'no', 'uk', 'bg', 'hr', 'sr', 'sk', 'sl',
  'ms', 'ka', 'he', 'sw', 'bn', 'ca',
  'fa', 'ur', 'ta', 'af', 'sq', 'az', 'hy', 'be', 'ne', 'si',
];

const TEAM_IMAGES = [
  '/images/david-zhang.webp',
  '/images/leo-liu.webp',
  '/images/mike-wang.webp',
  '/images/sarah-chen.webp',
];

function getBlogSlugs(locale) {
  const dir = path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.mdx')).map(f => path.basename(f, '.mdx'));
}

function getCoverImage(locale, slug) {
  const file = path.join(CONTENT_DIR, locale, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf-8').split('\n').slice(0, 30);
  for (const line of lines) {
    if (line.startsWith('coverImage:')) {
      return line.split(':', 2)[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function main() {
  const entries = [];

  // Team photos on about page
  for (const locale of LOCALES) {
    const imgs = TEAM_IMAGES.filter(i => fs.existsSync(path.join(PUBLIC_DIR, i.slice(1))));
    if (imgs.length) {
      entries.push({ loc: `${BASE_URL}/${locale}/about/`, images: imgs.map(i => `${BASE_URL}${i}`) });
    }
  }

  // Blog cover images
  for (const locale of LOCALES) {
    for (const slug of getBlogSlugs(locale)) {
      let cover = getCoverImage(locale, slug);
      if (!cover) continue;
      cover = cover.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (fs.existsSync(path.join(PUBLIC_DIR, cover.slice(1)))) {
        entries.push({ loc: `${BASE_URL}/${locale}/blog/${slug}/`, images: [`${BASE_URL}${cover}`] });
      }
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '          xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const e of entries) {
    xml.push('  <url>');
    xml.push(`    <loc>${esc(e.loc)}</loc>`);
    for (const img of e.images) {
      xml.push('    <image:image>');
      xml.push(`      <image:loc>${esc(img)}</image:loc>`);
      xml.push('    </image:image>');
    }
    xml.push('  </url>');
  }
  xml.push('</urlset>');

  const content = xml.join('\n') + '\n';
  for (const dir of [OUT_DIR, PUBLIC_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sitemap-images.xml'), content, 'utf-8');
  }
  console.log(`✓ sitemap-images.xml: ${entries.length} URL entries`);
}

main();
