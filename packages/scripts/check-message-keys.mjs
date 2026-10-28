#!/usr/bin/env node
/**
 * check-message-keys.mjs — 各 app 的 messages 必须与 en.json 的 key 集合完全一致。
 *
 * 为什么需要它：
 *   代码里的 `t('key', 'English fallback')` / `tb('key', variable)` 只有在
 *   **key 缺失**时才会露出 fallback。check-translations 只对比"值是否等于英文"
 *   （同值 fallback），发现不了**缺键**——而缺键是最容易漏、也最难在页面上看出来的：
 *   页面照常渲染，只是某个字段悄悄变成英文，或者变成代码里传进来的另一个变量
 *   （例如 blog 详情页 `service_brand` 缺了 48 次，服务名就回退成英文分类名
 *   "Brand Protection"，48 个语言全错，CI 一路绿灯）。
 *
 * 检查范围：apps/<app>/messages/<locale>.json（en 为基准）
 * 规则：
 *   - 缺 key      → ❌ 报错（会导致运行时回退）
 *   - 多余 key    → ⚠️ 只告警（不影响运行，但通常是改名残留）
 *   - 语言文件缺失 → ❌ 报错
 *
 * 用法: node packages/scripts/check-message-keys.mjs [--app=blog] [--quiet]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const onlyApp = (args.find((a) => a.startsWith('--app=')) || '').split('=')[1];
const quiet = args.includes('--quiet');

/** 把嵌套对象拍平成 a.b.c 形式的 key 集合 */
function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

const appsDir = path.join(ROOT, 'apps');
const apps = fs
  .readdirSync(appsDir)
  .filter((a) => !onlyApp || a === onlyApp)
  .filter((a) => fs.existsSync(path.join(appsDir, a, 'messages', 'en.json')));

let totalErrors = 0;
let totalWarns = 0;

for (const app of apps) {
  const msgDir = path.join(appsDir, app, 'messages');
  const enPath = path.join(msgDir, 'en.json');
  const enKeys = flatten(JSON.parse(fs.readFileSync(enPath, 'utf8')));
  const locales = fs
    .readdirSync(msgDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();

  const missingByLocale = [];
  const extraByLocale = [];

  for (const loc of locales) {
    if (loc === 'en') continue;
    const keys = flatten(JSON.parse(fs.readFileSync(path.join(msgDir, `${loc}.json`), 'utf8')));
    const missing = [...enKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !enKeys.has(k));
    if (missing.length) missingByLocale.push([loc, missing]);
    if (extra.length) extraByLocale.push([loc, extra]);
  }

  const problems = missingByLocale.length + extraByLocale.length;
  const tag = problems ? '❌' : '✅';
  console.log(`${tag} ${app}/messages — ${locales.length} 语言 × ${enKeys.size} keys`);

  if (missingByLocale.length) {
    // 按"同一个 key 缺在多少语言"聚合，便于一眼看出是哪个 key 漏了
    const keyToLocales = new Map();
    for (const [loc, keys] of missingByLocale) {
      for (const k of keys) {
        if (!keyToLocales.has(k)) keyToLocales.set(k, []);
        keyToLocales.get(k).push(loc);
      }
    }
    for (const [k, locs] of [...keyToLocales.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`   ❌ 缺 key: ${k} — ${locs.length} 个语言 (${locs.slice(0, 6).join(', ')}${locs.length > 6 ? ' …' : ''})`);
    }
    totalErrors += missingByLocale.reduce((n, [, k]) => n + k.length, 0);
  }

  if (extraByLocale.length && !quiet) {
    for (const [loc, keys] of extraByLocale.slice(0, 8)) {
      console.log(`   ⚠️  ${loc} 多出 ${keys.length} 个 key: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ' …' : ''}`);
    }
    totalWarns += extraByLocale.length;
  }
}

if (totalErrors) {
  console.log(`\n❌ 共 ${totalErrors} 处缺 key —— 缺 key 会让页面静默回退英文，必须补齐`);
  process.exit(1);
}
console.log(`\n✅ 所有 app 的 messages key 集合与 en 完全一致${totalWarns ? `（${totalWarns} 个语言有多余 key，仅告警）` : ''}`);
