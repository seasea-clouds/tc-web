#!/usr/bin/env node
/**
 * build-llms.mjs - 生成统一 LLM 发现文件
 * 
 * 输出:
 *   llms.txt            → 全量聚合（所有语言所有站点内容）
 *   llms-{locale}.txt   → 各语言 LLM 文件（48个）
 * 
 * 内容来源: 各子站的 messages/{locale}.json
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

function flatten(obj, prefix = '') {
  let result = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, p));
    } else if (typeof v === 'string' && v.trim()) {
      result[p] = v;
    }
  }
  return result;
}

const SKIP_KEYS = ['Search.', 'Blog.', 'ThankYou.', 'Quote.', 'ContactForm.'];

function isKeyUseful(key) {
  return !SKIP_KEYS.some(sk => key.startsWith(sk));
}

export function buildLLMs(baseUrl, outDir) {
  const appsDir = path.join(ROOT, 'apps');
  const apps = [];

  // 收集所有 app 的 messages
  for (const app of fs.readdirSync(appsDir)) {
    const appDir = path.join(appsDir, app);
    if (!fs.existsSync(path.join(appDir, 'messages'))) continue;
    apps.push({ name: app, dir: appDir });
  }

  const perLocale = {};

  for (const locale of LOCALES) {
    perLocale[locale] = `# SinoTrade Compliance - ${locale}\n\n`;
    perLocale[locale] += `> Multi-language compliance service content for ${locale}\n\n`;

    for (const app of apps) {
      const msgs = loadMessages(app.dir, locale);
      if (!msgs) continue;
      const flat = flatten(msgs);
      
      perLocale[locale] += `## ${app.name}\n\n`;
      for (const [key, val] of Object.entries(flat)) {
        if (isKeyUseful(key) && val.length > 10) {
          perLocale[locale] += `- ${key}: ${val}\n`;
        }
      }
      perLocale[locale] += '\n';
    }

    // 写入分语言 LLM 文件
    const langFile = locale === 'en' ? 'en' : locale;
    fs.writeFileSync(path.join(outDir, `llms-${langFile}.txt`), perLocale[locale], 'utf-8');
  }

  // 生成 llms.txt（全量聚合）
  const fullContent = Object.values(perLocale).join('\n\n---\n\n');
  fs.writeFileSync(path.join(outDir, 'llms.txt'), fullContent, 'utf-8');

  console.log(`✅ llms.txt (${(fullContent.length / 1024).toFixed(0)}KB)`);
  console.log(`✅ ${LOCALES.length} llms-{locale}.txt files`);
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
  buildLLMs(baseUrl, process.cwd());
}
