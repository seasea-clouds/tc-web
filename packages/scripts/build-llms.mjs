#!/usr/bin/env node
/**
 * build-llms.mjs - 生成统一 LLM 发现文件
 *
 * 输出:
 *   llms.txt            → 全量聚合（所有语言所有站点内容）
 *   llms-{locale}.txt   → 各语言 LLM 文件（48个）
 *
 * 内容来源: 各子站的 messages/{locale}.json + 站点结构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOCALES } from './discover-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// ── 服务链接映射 ──────────────────────────────────────────
const SERVICES = [
  { key: 'GACC', path: '/services/gacc/' },
  { key: 'Label', path: '/services/label/' },
  { key: 'CCC', path: '/services/ccc/' },
  { key: 'Cosmetics', path: '/services/cosmetics/' },
  { key: 'Ecommerce', path: '/services/ecommerce/' },
  { key: 'Brand', path: '/services/brand/' },
];

const BLOG_SLUGS = [
  '/blog/gacc-decree-248/',
  '/blog/gacc-decree-249/',
  '/blog/china-food-import/',
  '/blog/cosmetics-regulation/',
  '/blog/ccc-certification/',
  '/blog/cross-border-ecommerce/',
];

const ALL_LOCALES = [
  'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 'ar',
  'hi', 'th', 'vi', 'id', 'ms', 'tl', 'fa', 'ur', 'bn', 'pa',
  'te', 'mr', 'gu', 'kn', 'ml', 'ta', 'fi', 'sv', 'no', 'da',
  'nl', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'sr',
  'uk', 'el', 'tr', 'he', 'az', 'ka', 'hy', 'be', 'af', 'sq',
  'sv', 'sw', 'ne', 'si', 'ca', 'cy', 'is', 'mt', 'eu', 'gl',
];

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

function getTranslation(msgs, keyPath) {
  if (!msgs) return keyPath;
  const flat = flatten(msgs);
  return flat[keyPath] || keyPath;
}

export function buildLLMs(baseUrl, outDir) {
  const appsDir = path.join(ROOT, 'apps');
  const apps = [];
  for (const app of fs.readdirSync(appsDir)) {
    const appDir = path.join(appsDir, app);
    if (!fs.existsSync(path.join(appDir, 'messages'))) continue;
    apps.push({ name: app, dir: appDir });
  }

  const perLocale = {};

  for (const locale of LOCALES) {
    const lang = locale === 'en' ? 'en' : locale;
    const label = locale; // e.g. "English", "中文", "日本語"

    // 加载翻译
    const enMsgs = loadMessages(path.join(ROOT, 'apps/site'), 'en');
    const appMsgs = {};
    for (const app of apps) {
      const m = loadMessages(app.dir, locale);
      if (m) appMsgs[app.name] = m;
    }

    let content = `# SinoTrade Compliance - ${label}

> SinoTrade Compliance provides one-stop regulatory consulting services for China market entry — GACC registration, Chinese labeling, CCC certification, NMPA cosmetics filing, cross-border e-commerce, and brand protection.

`;

    // ── Services ────────────────────────────────
    content += '## Services\n\n';
    for (const svc of SERVICES) {
      const titleKey = `Home.services.${svc.key}`;
      const title = enMsgs ? (flatten(enMsgs)[titleKey] || svc.key) : svc.key;
      const url = `${baseUrl}${svc.path}`;
      content += `- [${title}](${url})\n`;
    }
    content += '\n';

    // ── Industries ──────────────────────────────
    content += '## Industries\n\n';
    const industries = [
      { key: 'Dairy', label: 'Dairy & Milk' },
      { key: 'MeatSeafood', label: 'Meat & Seafood' },
      { key: 'Wine', label: 'Wine & Spirits' },
      { key: 'Skincare', label: 'Skincare & Cosmetics' },
      { key: 'PetFood', label: 'Pet Food' },
      { key: 'Supplements', label: 'Health Supplements' },
      { key: 'Baby', label: 'Baby & Maternal' },
      { key: 'Electronics', label: 'Consumer Electronics' },
      { key: 'Medical', label: 'Medical Devices' },
      { key: 'Ecommerce', label: 'Cross-border E-commerce' },
    ];
    for (const ind of industries) {
      const url = `${baseUrl}/industries/${ind.key.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`;
      content += `- ${ind.label}\n`;
    }
    content += '\n';

    // ── Blog ────────────────────────────────────
    content += '## Blog\n\n';
    for (const slug of BLOG_SLUGS) {
      const url = `${baseUrl}${slug}`;
      content += `- Blog post\n`;
    }
    content += '\n';

    // ── Compliance Tools (portal) ───────────────
    content += '## Compliance Tools\n\n';
    content += `- [GACC Registration Check](${baseUrl}/c/check/gacc/)\n`;
    content += `- [CCC Certification Check](${baseUrl}/c/check/ccc/)\n`;
    content += `- [NMPA Cosmetics Check](${baseUrl}/c/check/cosmetics/)\n`;
    content += '\n';

    // ── Key content summary ─────────────────────
    content += '## Key Content\n\n';
    const summaryKeys = [
      'Home.heroTitle',
      'Home.heroSubtitle',
      'Services.title',
      'About.title',
      'About.desc',
    ];
    for (const key of summaryKeys) {
      if (appMsgs['portal']) {
        const val = getTranslation(appMsgs['portal'], key);
        if (val && val !== key) {
          content += `- ${key}: ${val}\n`;
        }
      }
      if (appMsgs['site']) {
        const val = getTranslation(appMsgs['site'], key);
        if (val && val !== key) {
          content += `- ${key}: ${val}\n`;
        }
      }
    }
    content += '\n';

    // ── Language links ──────────────────────────
    content += '## Languages\n\n';
    content += `[en] ${baseUrl}/en/\n`;
    for (const l of LOCALES) {
      if (l !== 'en') {
        content += `[${l}] ${baseUrl}/${l}/\n`;
      }
    }
    content += '\n';

    perLocale[locale] = content;

    // 写入分语言 LLM 文件
    const langFile = locale === 'en' ? 'en' : locale;
    fs.writeFileSync(path.join(outDir, `llms-${langFile}.txt`), content, 'utf-8');
  }

  // 生成 llms.txt（全量聚合 - 用英文作为主索引）
  const langFile = 'en';
  const langLabel = 'English';
  let fullContent = `# SinoTrade Compliance - English

> SinoTrade Compliance provides one-stop regulatory consulting services for China market entry.

## Available Languages

`;
  for (const l of LOCALES) {
    const label = l === 'en' ? 'English' : l;
    fullContent += `- [${l}](llms-${l}.txt)\n`;
  }
  fullContent += '\n---\n\n';
  fullContent += perLocale[langFile];

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
