#!/usr/bin/env node
/**
 * build-search-translations.mjs
 * 从 packages/ui/messages/*.json 提取 Search 命名空间，
 * 生成 search-widget-translations.json 供 search-widget.js 使用。
 *
 * 输出格式: { "en": { "placeholder": "...", "types": { "blog": "Insights" } }, "zh": {...} }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const UI_MESSAGES_DIR = path.join(ROOT, 'packages', 'ui', 'messages');
const OUT_DIR = path.resolve(process.argv[2] || path.join(ROOT, 'apps', 'site', 'public'));

const result = {};
let count = 0;

for (const file of fs.readdirSync(UI_MESSAGES_DIR).filter(f => f.endsWith('.json'))) {
  const locale = file.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(UI_MESSAGES_DIR, file), 'utf-8'));
  if (data.Search) {
    result[locale] = data.Search;
    count++;
  }
}

const outPath = path.join(OUT_DIR, 'search-widget-translations.json');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`Generated search-widget-translations.json: ${count} locales → ${outPath}`);
