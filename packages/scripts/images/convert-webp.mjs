#!/usr/bin/env node
/**
 * Pre-build: convert JPG/PNG → WebP, update static paths, archive originals.
 * Replaces scripts/images/convert-webp.py — pure Node.js, no Python.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';


const PROJECT_ROOT = process.cwd();
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images');
const ARCHIVE_DIR = path.join(PROJECT_ROOT, 'archive', 'images-original');

// Component files with static /images/ paths
const COMPONENT_FILES = [
  path.join(PROJECT_ROOT, 'src', 'components', 'AboutExpert.tsx'),
  path.join(PROJECT_ROOT, 'src', 'components', 'TrustedBy.tsx'),
  path.join(PROJECT_ROOT, 'src', 'app', '(site)', '[locale]', 'about', 'page.tsx'),
  path.join(PROJECT_ROOT, 'src', 'app', '(site)', '[locale]', 'page.tsx'),
];

function walkImages(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkImages(full));
    } else if (['.jpg', '.jpeg', '.png'].includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

async function convertToWebp(src) {
  const img = sharp(src);
  const meta = await img.metadata();
  const quality = meta.hasAlpha ? 90 : 80;
  const webpPath = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  await img.webp({ quality }).toFile(webpPath);
  const origSize = fs.statSync(src).size;
  const webpSize = fs.statSync(webpPath).size;
  return { orig: origSize, webp: webpSize };
}

function updateComponentPaths(filepath) {
  if (!fs.existsSync(filepath)) return 0;
  let text = fs.readFileSync(filepath, 'utf-8');
  const pattern = /(\/images\/[^"'\s\)\}]+)\.(?:jpg|jpeg|png)(?=["'\s\)\}])/g;
  let count = 0;
  const newText = text.replace(pattern, (_, p) => { count++; return p + '.webp'; });
  if (count) fs.writeFileSync(filepath, newText, 'utf-8');
  return count;
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('ERROR: images dir not found');
    process.exit(1);
  }

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const images = walkImages(IMAGES_DIR).sort();
  if (!images.length) {
    console.log('No JPG/PNG images found.');
    return;
  }

  console.log(`Converting ${images.length} images to WebP...\n`);
  let totalOrig = 0, totalWebp = 0;

  for (const img of images) {
    const rel = path.relative(IMAGES_DIR, img);
    const archivePath = path.join(ARCHIVE_DIR, rel);
    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(path.dirname(archivePath), { recursive: true });
      fs.copyFileSync(img, archivePath);
    }

    const { orig, webp } = await convertToWebp(img);
    totalOrig += orig;
    totalWebp += webp;
    const saved = ((1 - webp / orig) * 100).toFixed(0);
    console.log(`  ✓ ${rel}: ${(orig / 1024).toFixed(0)}K → ${(webp / 1024).toFixed(0)}K (${saved}% saved)`);
  }

  const compUpdates = COMPONENT_FILES.reduce((sum, f) => sum + updateComponentPaths(f), 0);
  console.log(`\nComponent paths updated: ${compUpdates}`);

  const savingsPct = totalOrig ? ((1 - totalWebp / totalOrig) * 100).toFixed(0) : 0;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Images: ${images.length} converted`);
  console.log(`Size: ${(totalOrig / 1024).toFixed(0)}K → ${(totalWebp / 1024).toFixed(0)}K (${savingsPct}% saved)`);
}

main().catch(err => { console.error(err); process.exit(1); });
