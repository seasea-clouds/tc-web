#!/usr/bin/env node
/**
 * build-llms.mjs - 生成统一 LLM 发现文件
 *
 * 输出:
 *   llms.txt            → 全量聚合（所有语言所有站点内容）
 *   llms-{locale}.txt   → 各语言 LLM 文件（48个）
 *
 * 内容来源: discover-routes.mjs 自动发现的路由 + 翻译摘要
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { discoverAll, expandLocales, LOCALES } from './discover-routes.mjs';

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

// 导航分组名称映射（英文）
const GROUP_LABELS = {
  about: 'About',
  blog: 'Blog',
  c: 'Check & Report',
  faq: 'FAQ',
  industries: 'Industries',
  packages: 'Packages',
  privacy: 'Privacy Policy',
  quote: 'Get a Quote',
  regulations: 'Regulations',
  services: 'Services',
};

// 服务子项标签映射
const SERVICE_LABELS = {
  'brand': 'Brand Protection',
  'ccc': 'CCC Certification',
  'cosmetics': 'NMPA Cosmetics Filing',
  'ecommerce': 'Cross-border E-commerce',
  'gacc': 'GACC Registration',
  'label': 'Chinese Label Compliance',
};

// 需要跳过的翻译 key（太长或太细节的不适合摘要）
const SKIP_KEYS = [
  'Check.', 'Report.', 'ReportSection.', 'Privacy.', 'Cookie.',
  'AiAssistance.', 'Auth.', 'Dashboard.',
];

// 博客 slug → 真实标题映射（从 discover-routes 补充）
/**
 * slug → frontmatter title 映射，按语言从 content 目录现读。
 * 硬编码清单只作为兜底：新增文章无需有人记得来这里补一行。
 */
const BLOG_TITLE_CACHE = {};
function loadBlogTitles(locale, app = 'blog') {
  const cacheKey = `${app}:${locale}`;
  if (BLOG_TITLE_CACHE[cacheKey]) return BLOG_TITLE_CACHE[cacheKey];
  const map = {};
  const dir = path.join(ROOT, `apps/${app}/content`, locale);
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx')) continue;
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) continue;
      const t = m[1].match(/^title:\s*(.+)$/m);
      if (!t) continue;
      let value = t[1].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      map[file.replace(/\.mdx$/, '')] = value;
    }
  }
  BLOG_TITLE_CACHE[cacheKey] = map;
  return map;
}

const LANG_LABELS = {
      en: 'English', zh: '中文', ja: '日本語', ko: '한국어', fr: 'Français',
      de: 'Deutsch', es: 'Español', pt: 'Português', ru: 'Русский', ar: 'العربية',
      hi: 'हिन्दी', th: 'ไทย', vi: 'Tiếng Việt', id: 'Bahasa Indonesia',
      ms: 'Bahasa Melayu', tl: 'Filipino', fa: 'فارسی', ur: 'اردو',
      bn: 'বাংলা', pa: 'ਪੰਜਾਬੀ', te: 'తెలుగు', mr: 'मराठी',
      gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', ta: 'தமிழ்',
      fi: 'Suomi', sv: 'Svenska', no: 'Norsk', da: 'Dansk',
      nl: 'Nederlands', pl: 'Polski', cs: 'Čeština', sk: 'Slovenčina',
      hu: 'Magyar', ro: 'Română', bg: 'Български', hr: 'Hrvatski',
      sl: 'Slovenščina', sr: 'Srpski', uk: 'Українська', el: 'Ελληνικά',
      tr: 'Türkçe', he: 'עברית', az: 'Azərbaycan', ka: 'ქართული',
      hy: 'Հայերեն', be: 'Беларуская', af: 'Afrikaans', sq: 'Shqip',
  sw: 'Kiswahili', ne: 'नेपाली', si: 'සිංහල', ca: 'Català',
};

const BLOG_TITLES = {
  'gacc-registration-guide': 'GACC Registration Guide',
  'ccc-certification-explained': 'CCC Certification Complete Guide',
  'china-market-entry-compliance-guide': 'China Market Entry Checklist',
  'china-label-compliance': 'Chinese Label Compliance Guide',
  'china-trademark-registration': 'Trademark Registration in China',
  'cosmetics-nmpa-filing': 'NMPA Cosmetics Filing Guide',
  'cross-border-ecommerce-china': 'Cross-Border E-Commerce in China',
  'green-coffee-beans-china': 'Exporting Green Coffee Beans to China',
  'bonded-ecommerce-export-china-guide': 'Bonded E-Commerce Exports to China (Mode 1210)',
  'service-framework-bonded-ecommerce-china-plan': 'Service Framework for a Bonded E-Commerce China Plan',
};

function filterSummaryKeys(msgs) {
  if (!msgs) return [];
  const flat = flatten(msgs);
  const result = [];
  for (const [key, val] of Object.entries(flat)) {
    if (SKIP_KEYS.some(sk => key.startsWith(sk))) continue;
    if (val.length > 200 || val.length < 3) continue;
    // 只输出值，不输出 key: 避免翻译 key 泄漏
    result.push(val);
  }
  return result;
}

function getDisplayText(route, enMsgs, locale = 'en') {
  // 根据路由路径推断显示文本（必须按当前 locale 去前缀，硬编码 /en/ 会让
  // 所有非英文 llms-{locale}.txt 的标题退化成 slug 拼接）
  const rel = route.replace(`/${locale}/`, '/').replace(/\/$/, '');
  const parts = rel.split('/').filter(Boolean);

  if (parts[0] === 'services' && parts[1]) {
    return SERVICE_LABELS[parts[1]] || parts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (parts[0] === 'blog' && parts.length > 1) {
    // 优先用该语言的 frontmatter 标题，其次硬编码清单，最后 slug 转标题
    const slug = parts[1];
    const localized = loadBlogTitles(locale)[slug];
    if (localized) return localized;
    if (BLOG_TITLES[slug]) return BLOG_TITLES[slug];
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (parts[0] === 'regulations' && parts.length > 1) {
    const slug = parts[1];
    const localized = loadBlogTitles(locale, 'regulations')[slug];
    if (localized) return localized;
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (parts[0] === 'industries' && parts.length > 1) {
    const slug = parts[1].replace(/-/g, ' ');
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  if (parts[0] === 'c') {
    if (parts.includes('check')) {
      const CHECK_LABELS = {
        'gacc': 'GACC Registration Check',
        'label': 'Chinese Label Compliance Check',
        'ccc': 'CCC Certification Check',
        'nmpa': 'NMPA Cosmetics Filing Check',
        'crossborder': 'Cross-border E-commerce Check',
        'trademark': 'Trademark Registration Check',
      };
      const tool = parts[2];
      return CHECK_LABELS[tool] || 'Compliance Check';
    }
    return 'Portal';
  }

  // 一级页面：用翻译 key 找可读名称
  if (parts.length === 1) {
    const keyMap = {
      'about': 'Home.aboutUs',
      'faq': 'Faq.title',
      'packages': 'Home.service',
      'quote': 'Quote.title',
      'privacy': 'Privacy.title',
      'services': 'Home.servicesTitle',
      'blog': 'Blog.title',
    };
    const key = keyMap[parts[0]];
    if (key && enMsgs) {
      const flat = flatten(enMsgs);
      const val = flat[key];
      if (val && val !== key) return val;
    }
  }

  // 回退：slug 转标题
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function sortRoutes(routes) {
  const order = ['about', 'services', 'industries', 'blog', 'regulations', 'faq', 'quote', 'c', 'packages', 'privacy'];
  return routes.sort((a, b) => {
    const relA = a.replace('/en/', '').replace(/\/$/, '');
    const relB = b.replace('/en/', '').replace(/\/$/, '');
    const partsA = relA.split('/').filter(Boolean);
    const partsB = relB.split('/').filter(Boolean);
    const idxA = order.indexOf(partsA[0]);
    const idxB = order.indexOf(partsB[0]);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
}

export function buildLLMs(baseUrl, outDir) {
  const apps = discoverAll();
  const localesExpanded = expandLocales(apps);

  // 加载 site 的英文翻译作为摘要基准
  const siteEnMsgs = loadMessages(path.join(ROOT, 'apps/site'), 'en');

  const perLocale = {};

  for (const localeEntry of localesExpanded) {
    const locale = localeEntry.locale;
    const routes = sortRoutes([...localeEntry.routes]);

    const label = LANG_LABELS[locale] || locale;

    const localeMsgs = loadMessages(path.join(ROOT, 'apps/site'), locale) || siteEnMsgs;

    let content = `# SinoTrade Compliance - ${label}\n\n`;
    content += `> SinoTrade Compliance provides one-stop regulatory consulting services for China market entry.\n\n`;

    // ── Navigation (按分组聚合，合并层级) ────────
    // 将路由按分组组织，一级作为 section，二级作为该 section 下的链接
    const navSections = {}; // key: group -> { group, children: [{ path, display }] }
    let rootItem = null;

    for (const route of routes) {
      const rel = route.replace(`/${locale}/`, '/').replace(/\/$/, '');
      if (rel === '' || rel === '/') continue;

      const parts = rel.split('/').filter(Boolean);
      if (parts.length === 0) continue;

      if (parts.length === 1) {
        // 一级路由：作为 section 标题
        rootItem = { path: route, display: getDisplayText(route, localeMsgs, locale) };
        if (!navSections[parts[0]]) {
          navSections[parts[0]] = { group: parts[0], children: [rootItem] };
        }
      } else {
        // 二级路由：添加到对应 section 的 children
        const group = parts[0];
        if (!navSections[group]) {
          navSections[group] = { group, children: [] };
        }
        navSections[group].children.push({
          path: route,
          display: getDisplayText(route, localeMsgs, locale),
        });
      }
    }

    // 按 order 输出 section
    const sectionOrder = Object.keys(navSections);
    for (const group of sectionOrder) {
      const section = navSections[group];
      const sectionTitle = GROUP_LABELS[group] || getDisplayText(`/${group}/`, localeMsgs, locale);
      content += `## ${sectionTitle}\n\n`;

      for (const child of section.children) {
        content += `- [${child.display}](${child.path})\n`;
      }
      content += '\n';
    }

    // ── Key Content Summary ─────────────────────
    content += `## Key Content\n\n`;
    // 本语言文案优先：否则 47 个非英文文件里塞的是英文卖点
    const summaries = filterSummaryKeys(localeMsgs);
    for (const s of summaries.slice(0, 15)) {
      content += `- ${s}\n`;
    }
    content += '\n';

    // ── Language Links ──────────────────────────
    content += `## Languages\n\n`;
    for (const l of LOCALES) {
      content += `- [${LANG_LABELS[l] || l}](${baseUrl}/${l}/)\n`;
    }
    content += '\n';

    perLocale[locale] = content;
  }

  // 写入 llms.txt（全量聚合 - 用英文作为主索引）
  let fullContent = `# SinoTrade Compliance - English

> SinoTrade Compliance provides one-stop regulatory consulting services for China market entry.

## Available Languages

`;
  for (const l of LOCALES) {
    fullContent += `- [${l}](llms-${l}.txt)\n`;
  }
  fullContent += '\n---\n\n';
  fullContent += perLocale['en'];
  fs.writeFileSync(path.join(outDir, 'llms.txt'), fullContent, 'utf-8');
  console.log(`✅ llms.txt (${(fullContent.length / 1024).toFixed(0)}KB)`);

  // 写入 llms-{locale}.txt（各语言独立文件，末尾加反向链接）
  for (const [locale, content] of Object.entries(perLocale)) {
    // 在末尾追加反向导航：指向 llms.txt 和同目录其他语言
    const reverseNav = `\n---\n\n## Other Languages\n\n- [llms.txt index](llms.txt)\n`;
    const filePath = path.join(outDir, `llms-${locale}.txt`);
    fs.writeFileSync(filePath, content + reverseNav, 'utf-8');
  }
  console.log(`✅ ${Object.keys(perLocale).length} llms-{locale}.txt files written`);
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
  const { 'base-url': baseUrl, 'out-dir': outDir } = parseArgs();
  if (!baseUrl) { console.error('Usage: --base-url=... [--out-dir=...]'); process.exit(1); }
  const dest = outDir || process.cwd();
  buildLLMs(baseUrl, dest);
}
