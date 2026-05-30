#!/usr/bin/env node
/**
 * build-search-index.mjs - 生成统一搜索索引
 * 
 * 输出: search-index-{locale}.json（各站 CDN 共享）
 * 内容来源: 各子站 messages/{locale}.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOCALES } from './discover-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function loadMessages(appDir, locale) {
  const msgPath = path.join(appDir, 'messages', `${locale}.json`);
  if (!fs.existsSync(msgPath)) return null;
  return JSON.parse(fs.readFileSync(msgPath, 'utf-8'));
}

function flattenForSearch(obj, prefix = '') {
  const items = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      items.push(...flattenForSearch(v, p));
    } else if (typeof v === 'string' && v.trim() && v.length > 5) {
      items.push({ key: p, value: v });
    }
  }
  return items;
}

export function buildSearchIndexes(baseUrl, outDir) {
  const appsDir = path.join(ROOT, 'apps');
  const apps = [];

  for (const app of fs.readdirSync(appsDir)) {
    const appDir = path.join(appsDir, app);
    if (!fs.existsSync(path.join(appDir, 'messages'))) continue;
    apps.push({ name: app, dir: appDir, basePath: app === 'site' ? '/' : `/${app === 'portal' ? 'c' : app}/` });
  }

  for (const locale of LOCALES) {
    const index = [];
    for (const app of apps) {
      const msgs = loadMessages(app.dir, locale);
      if (!msgs) continue;
      const flat = flattenForSearch(msgs);
      for (const item of flat) {
        index.push({
          key: `${app.name}:${item.key}`,
          text: item.value.slice(0, 500),
        });
      }
    }
    fs.writeFileSync(path.join(outDir, `search-index-${locale}.json`), JSON.stringify(index, null, 2), 'utf-8');
  }

  console.log(`✅ ${LOCALES.length} search-index-{locale}.json files`);
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
  buildSearchIndexes(baseUrl || 'https://sinotradecompliance.com', process.cwd());
}
