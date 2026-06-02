#!/usr/bin/env node
/**
 * Unified message sync: synchronizes all language files from en.json baseline.
 *
 * Usage:
 *   node scripts/sync-messages.mjs <messages-dir>
 *   node scripts/sync-messages.mjs apps/site/messages
 *   node scripts/sync-messages.mjs apps/portal/messages
 *   node scripts/sync-messages.mjs apps/blog/messages
 *
 * Or sync all known projects:
 *   node scripts/sync-messages.mjs --all
 *
 * Adds missing keys from en.json to all other language files.
 * Does NOT overwrite existing translations.
 */

import fs from 'fs';
import path from 'path';

const ALL_PROJECTS = [
  'apps/site/messages',
  'apps/portal/messages',
  'apps/blog/messages',
  'packages/ui/messages',  // Shared UI messages (Footer, Search)
];

function sync(dir) {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    console.error(`  ❌ Not found: ${dir}`);
    return;
  }

  const en = JSON.parse(fs.readFileSync(path.join(absDir, 'en.json'), 'utf-8'));
  const files = fs.readdirSync(absDir)
    .filter(f => f.endsWith('.json') && f !== 'en.json')
    .sort();

  let totalKeys = 0;
  const projectName = path.basename(path.dirname(absDir));

  for (const file of files) {
    const filePath = path.join(absDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let changes = 0;

    for (const [ns, nsVal] of Object.entries(en)) {
      if (typeof nsVal !== 'object' || nsVal === null) continue;
      if (!data[ns] || typeof data[ns] !== 'object') {
        data[ns] = {};
      }
      for (const [key, enVal] of Object.entries(nsVal)) {
        if (typeof enVal !== 'string') continue;
        if (data[ns][key] === undefined || data[ns][key] === null) {
          data[ns][key] = enVal;
          changes++;
        }
      }
    }

    if (changes > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      totalKeys += changes;
    }
  }

  if (totalKeys > 0) {
    console.log(`  ✅ ${projectName}: ${totalKeys} keys synced`);
  } else {
    console.log(`  ✓ ${projectName}: up to date`);
  }
}

const target = process.argv[2];
if (target === '--all') {
  console.log('Syncing all projects...');
  for (const p of ALL_PROJECTS) sync(p);
} else if (target) {
  sync(target);
} else {
  console.log('Usage: node scripts/sync-messages.mjs <messages-dir> | --all');
  process.exit(1);
}
