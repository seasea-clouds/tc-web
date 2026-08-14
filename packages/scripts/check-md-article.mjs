#!/usr/bin/env node
/**
 * check-md-article.mjs — 文章 MDX 内容质量检查（48 语言全覆盖）
 *
 * 编译流水线中检测新文章常见质量问题。
 *
 * 问题类型：
 *   [R01] heading-excessive-newlines     — 标题之间的空行不应超过 1 行
 *   [R02] list-excessive-newlines        — 列表项之间的空行不应超过 1 行
 *   [R03] emoji-list-inline              — Emoji 图形列表各项应分行，不应混在一行
 *   [R04] hash-heading-syntax            — ##/### 标题语法错误（缺空格、使用 # 或 ####+）
 *   [R05] char-flowchart                 — 禁止字符类流程图/路线图（框线字符 + 箭头）
 *   [R06] missing-contact-ending         — 文章末尾缺少联系我们/免费评估链接
 *   [R07] missing-48-translation         — 文章在所有 48 个语言中缺少翻译版本
 *   [R08] title-punctuation              — 文章标题含冒号/破折号/- 符号
 *   [R09] category-i18n                  — 文章分立的分类标签缺少 48 语言翻译键
 *   [R11] cta-format                      — CTA 链接格式异常（非 联系我们/Contact us 文本、/quote/ 路径、zh 用 /en/）
 *   [R12] body-hr                         — 正文中不应出现分割线 <hr>（---）
 *   [R13] list-item-blank-line            — 连续列表项之间有空白行（破坏渲染为独立列表）
 *   [R14] category-unknown                — 文章分类不在预设标签列表中
 *   [R15] list-items-inline               — 多行列表项混在同一行
 *   [R16] body-references                 — 正文中不应有 ## References 章节（应使用 frontmatter references）
 *   [R17] ref-chinese-in-en               — 英文文章参考链接标题含中文（应翻译）
 *   [R19] cta-link-length                  — CTA 链接文本为整句而非简短联系短语（48 语言）
 *   [R20] reference-title-translation      — 非英文语种参考文献标题与英文版完全相同（应翻译）
 *
 * 用法：
 *   node check-md-article.mjs                # 检查所有语言
 *   node check-md-article.mjs --ci            # CI 模式，有 error 则 exit 1
 *   node check-md-article.mjs --lang=zh       # 只检查指定语言
 *   node check-md-article.mjs --rule=R01      # 只运行指定规则
 *   node check-md-article.mjs --project=blog  # 检查 blog 项目（默认）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const filterLang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || null;
const filterRule = args.find(a => a.startsWith('--rule='))?.split('=')[1]?.toUpperCase() || null;
const project = args.find(a => a.startsWith('--project='))?.split('=')[1] || 'blog';

// 48 种支持的语言（与 locales.json 同步）
const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru',
  'ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi',
  'da','no','uk','bg','hr','sr','sk','sl',
  'ms','ka','he','sw','bn','ca',
  'fa','ur','ta','af','sq','az','hy','be','ne','si',
];

// 项目内容目录映射
const PROJECT_CONTENT_DIRS = {
  blog: 'apps/blog/content',
};

function getContentDir(p) {
  return PROJECT_CONTENT_DIRS[p] ? path.join(repoRoot, PROJECT_CONTENT_DIRS[p]) : null;
}

function getBlogMessagesDir() {
  return path.join(repoRoot, 'apps/blog/messages');
}

// ============================================================
// Emoji 集合（用于图形列表项检测）
// ============================================================
// 常见列表标记类 emoji（使用 \u{XXXXX} 语法支持 BMP 外字符）
const LIST_EMOJI_RE = /[\u2705\u274C\u26A0\u26D4\u{1F6AB}\u{1F534}\u{1F7E1}\u{1F7E2}\u{1F535}\u2795\u2796\u{1F4CC}\u{1F3AF}\u{1F4A1}\u{1F539}\u27A1\uFE0F\u{1F4A0}\u{1F6D1}\u{1F6A8}\u{1F514}\u{1F50D}\u{1F4CB}\u{1F4CA}\u{1F3C6}\u{1F947}\u{1F948}\u{1F949}\u2B50\u2728\u{1F31F}\u{1F525}\u26A1\u{1F4D6}\u{1F4DC}\u{1F4C4}\u270F\uFE0F\u{1F58B}\uFE0F\u{1F4DD}\u{1F3ED}\u{1F3E0}\u{1F3E6}\u{1F3E2}\u{1F3F0}\u{1F310}]/u;

// Unicode 框线字符（用于流程图检测）
const BOX_DRAWING_RE = /[\u2500-\u257F]/;

// ============================================================
// Finds 收集（统一扁平结构：每个问题一条记录）
// ============================================================
const findings = [];
let totalFiles = 0;
let totalErrors = 0;
let totalWarnings = 0;

function addFinding(opts) {
  const {
    file = '',
    lang = '',
    rule = 'GLOBAL',
    severity = 'error',
    line = 0,
    text = '',
    description = '',
  } = opts;

  findings.push({ file, lang, rule, severity, line, text, description });

  if (severity === 'error') totalErrors++;
  else totalWarnings++;
}

// ============================================================
// 规则实现
// ============================================================

/**
 * R01: heading-excessive-newlines
 * 标题之间不应有过多连续空行（连续 3 行及以上空白）
 * 当两个标题之间没有任何正文内容时，最多允许 1 个空行
 */
function checkR01(content, relPath, lang) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let inCodeBlock = false;

  // 检测连续 3+ 空行
  let blankRun = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (/^---\s*$/.test(trimmed)) {
      if (!inFrontmatter) { inFrontmatter = true; continue; }
      inFrontmatter = false; continue;
    }
    if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; continue; }
    if (inFrontmatter || inCodeBlock) { blankRun = 0; continue; }

    if (trimmed === '') {
      blankRun++;
    } else {
      if (blankRun > 2) {
        addFinding({
          file: relPath, lang,
          rule: 'R01', severity: 'error',
          line: i + 1,
          text: `第 ${i - blankRun + 1}-${i} 行连续 ${blankRun} 个空行`,
          description: `发现连续 ${blankRun} 个空行（最多允许 2 个连续空行）`,
        });
      }
      blankRun = 0;
    }
  }
}

/**
 * R02: list-excessive-newlines
 * 列表项之间的空行不应超过 1 行
 */
function checkR02(content, relPath, lang) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (/^---\s*$/.test(trimmed)) {
      if (!inFrontmatter) { inFrontmatter = true; continue; }
      inFrontmatter = false; continue;
    }
    if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; continue; }
    if (inFrontmatter || inCodeBlock) continue;

    const isListItem = /^[\s]*[-*]\s/.test(trimmed) || /^[\s]*\d+\.\s/.test(trimmed);
    if (!isListItem) continue;

    let blankCount = 0;
    let j = i + 1;
    while (j < lines.length) {
      const nt = lines[j].trim();
      if (nt === '') { blankCount++; j++; continue; }
      const isNextLi = /^[\s]*[-*]\s/.test(nt) || /^[\s]*\d+\.\s/.test(nt);
      if (isNextLi && blankCount > 1) {
        addFinding({
          file: relPath,
          lang,
          rule: 'R02',
          severity: 'error',
          line: j + 1,
          text: `"${trimmed.slice(0, 40)}…" → 下一列表项`,
          description: `列表项间有 ${blankCount} 个空行（最多 1 行）`,
        });
      }
      break;
    }
  }
}

/**
 * R03: emoji-list-inline
 * Emoji 图形列表项应分行，不应混在一行
 */
function checkR03(content, relPath, lang) {
  const lines = content.split('\n');
  let fmStage = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^---\s*$/.test(trimmed)) {
      if (fmStage === 0) { fmStage = 1; continue; }
      if (fmStage === 1) { fmStage = 2; continue; }
      continue;
    }
    if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; continue; }
    if (fmStage < 2 || inCodeBlock) continue;
    if (/^#/.test(trimmed) || /^[\s]*[-*]\s/.test(trimmed) || /^[\s]*\d+\.\s/.test(trimmed)) continue;

    const emojis = [];
    let match;
    const re = new RegExp(LIST_EMOJI_RE.source, 'gu');
    while ((match = re.exec(trimmed)) !== null) {
      emojis.push({ index: match.index });
    }

    // 多个 emoji 且间距 >5 字符 = 疑似内联列表
    if (emojis.length >= 2) {
      const spaced = emojis.filter((e, idx) => idx === 0 || e.index - emojis[idx - 1].index > 5);
      if (spaced.length >= 2) {
        addFinding({
          file: relPath,
          lang,
          rule: 'R03',
          severity: 'error',
          line: i + 1,
          text: trimmed.slice(0, 80),
          description: `发现 ${emojis.length} 个 emoji 标记混在一行，每个应独占一行`,
        });
      }
    }
  }
}

/**
 * R04: hash-heading-syntax
 * 标题语法错误（缺空格、不用 # 或 ####+）
 */
function checkR04(content, relPath, lang) {
  const lines = content.split('\n');
  let fmStage = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^---\s*$/.test(trimmed)) {
      if (fmStage === 0) { fmStage = 1; continue; }
      if (fmStage === 1) { fmStage = 2; continue; }
      continue;
    }
    if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; continue; }
    if (fmStage < 2 || inCodeBlock) continue;
    if (!trimmed.startsWith('#')) continue;

    // `# Text` — 单个 #（不支持 h1）
    if (/^# (?!#)/.test(trimmed)) {
      addFinding({
        file: relPath, lang,
        rule: 'R04', severity: 'error',
        line: i + 1,
        text: trimmed.slice(0, 80),
        description: '使用单个 "# "，应改为 "## " 或 "### "',
      });
      continue;
    }
    // `####+...` — 4 个以上 #
    if (/^#{4,}\s/.test(trimmed)) {
      addFinding({
        file: relPath, lang,
        rule: 'R04', severity: 'error',
        line: i + 1,
        text: trimmed.slice(0, 80),
        description: '使用 4 个以上 "#"，只支持 "## " 和 "### "',
      });
      continue;
    }
    // `##Text` 或 `###Text` — 缺少空格（# 后直接跟非空白非 # 字符）
    if (/^#{2,3}[^\s#]/.test(trimmed)) {
      addFinding({
        file: relPath, lang,
        rule: 'R04', severity: 'error',
        line: i + 1,
        text: trimmed.slice(0, 80),
        description: '##/### 后缺少空格',
      });
      continue;
    }
  }
}

/**
 * R05: char-flowchart
 * 禁止字符类流程图/路线图
 */
function checkR05(content, relPath, lang) {
  const lines = content.split('\n');

  // 检测包含框线字符的代码块
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const codeLines = match[0].split('\n');
    let boxCount = 0;
    for (const ln of codeLines) {
      if (BOX_DRAWING_RE.test(ln)) boxCount++;
    }
    if (boxCount >= 3) {
      const preLines = content.slice(0, match.index).split('\n');
      addFinding({
        file: relPath, lang,
        rule: 'R05', severity: 'error',
        line: preLines.length,
        text: `代码块含 ${boxCount} 行框线字符`,
        description: '代码块内含字符画流程图/路线图（使用 ┌┐└┘│─ 等），应改用 Mermaid 或 SVG',
      });
    }
  }

  // 非代码块正文中的 box-drawing 字符
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  const nonCodeLines = withoutCode.split('\n');
  let boxCount = 0;
  let firstLine = -1;
  for (let i = 0; i < nonCodeLines.length; i++) {
    if (BOX_DRAWING_RE.test(nonCodeLines[i])) {
      boxCount++;
      if (firstLine === -1) firstLine = i + 1;
    }
  }
  if (boxCount >= 3) {
    addFinding({
      file: relPath, lang,
      rule: 'R05', severity: 'error',
      line: firstLine,
      text: `正文含 ${boxCount} 行框线字符`,
      description: '正文中出现字符画流程图/路线图',
    });
  }
}

/**
 * R06: missing-contact-ending
 * 文章末尾缺少联系我们/免费评估链接
 */
function checkR06(content, relPath, lang) {
  const lines = content.trim().split('\n');
  const tailLines = lines.slice(-10);

  // 语言无关检测：末尾 10 行内是否存在指向 /packages/ 或 /quote/ 的链接
  let hasCta = false;

  for (const line of tailLines) {
    const linkUrl = line.match(/\]\(([^)]+)\)/)?.[1] || '';
    if (!linkUrl) continue;

    if (/\/packages\/|\/quote\//.test(linkUrl)) {
      hasCta = true;
      break;
    }
  }

  if (!hasCta) {
    addFinding({
      file: relPath, lang,
      rule: 'R06', severity: 'error',
      line: lines.length,
      text: '缺少"联系我们/免费评估"结尾链接',
      description: '文章末尾需包含指向 /packages/ 或 /quote/ 的 CTA 链接，例如 "[联系我们](/locale/packages/) 获取免费评估"',
    });
  }
}

/**
 * R07: missing-48-translation
 * 文章在所有 48 个语言中缺少翻译版本
 */
function checkR07(contentDir) {
  const enDir = path.join(contentDir, 'en');
  if (!fs.existsSync(enDir)) return;

  const enSlugs = fs.readdirSync(enDir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''));

  for (const slug of enSlugs) {
    const missing = [];
    for (const locale of LOCALES) {
      if (!fs.existsSync(path.join(contentDir, locale, `${slug}.mdx`))) {
        missing.push(locale);
      }
    }
    if (missing.length > 0) {
      addFinding({
        file: `content/en/${slug}.mdx`,
        lang: 'en',
        rule: 'R07',
        severity: 'error',
        line: 1,
        text: `${slug}`,
        description: `缺少 ${missing.length} 个语言版本: ${missing.join(', ')}`,
      });
    }
  }
}

/**
 * R08: title-punctuation
 * 文章标题不应含冒号/破折号/连字符
 */
function checkR08(content, relPath, lang) {
  const titleRaw = content.match(/^title:\s*"(.+?)"/m);
  if (!titleRaw) return;
  const title = titleRaw[1];
  const titleLineNum = content.split('\n').findIndex(l => l.startsWith('title:')) + 1;

  if (/[:：]/.test(title)) {
    addFinding({
      file: relPath, lang,
      rule: 'R08', severity: 'error',
      line: titleLineNum,
      text: `含半角/全角冒号: "${title.slice(0, 60)}"`,
      description: '文章标题不应包含半角或全角冒号',
    });
  }

  if (/[—–]/.test(title)) {
    addFinding({
      file: relPath, lang,
      rule: 'R08', severity: 'error',
      line: titleLineNum,
      text: `含破折号: "${title.slice(0, 60)}"`,
      description: '文章标题不应包含破折号（— 或 –）',
    });
  }

  if (/-/.test(title)) {
    addFinding({
      file: relPath, lang,
      rule: 'R08', severity: 'error',
      line: titleLineNum,
      text: `含连字符: "${title.slice(0, 60)}"`,
      description: '文章标题不应包含连字符 -',
    });
  }
}

/**
 * R09: category-i18n
 * 文章分类标签需要 48 语言翻译键
 * 每个唯一分类生成一条汇总报告，列出所有缺失翻译的语言
 */
function checkR09(contentDir, msgDir) {
  // 只从英文版收集基础分类（作为基线）
  const enDir = path.join(contentDir, 'en');
  if (!fs.existsSync(enDir)) return;

  const cats = new Set();
  for (const f of fs.readdirSync(enDir).filter(f => f.endsWith('.mdx'))) {
    const c = fs.readFileSync(path.join(enDir, f), 'utf-8');
    const cat = c.match(/^category:\s*"(.+?)"/m)?.[1];
    if (cat) cats.add(cat);
  }

  for (const cat of cats) {
    const key = 'cat_' + cat.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const missingLangs = [];

    for (const locale of LOCALES) {
      const mf = path.join(msgDir, `${locale}.json`);
      if (!fs.existsSync(mf)) {
        missingLangs.push(`${locale}(file missing)`);
        continue;
      }
      const msgs = JSON.parse(fs.readFileSync(mf, 'utf-8'));
      if (!(msgs?.Blog?.[key])) {
        missingLangs.push(locale);
      }
    }

    if (missingLangs.length > 0) {
      addFinding({
        file: `messages/*.json`,
        lang: '-',
        rule: 'R09',
        severity: 'error',
        line: 1,
        text: `分类 "${cat}" → 键 "Blog.${key}" 在 ${missingLangs.length} 个语言中缺失`,
        description: `需要在以下语言的 Blog 命名空间添加 "${key}" 键: ${missingLangs.join(', ')}`,
      });
    }
  }
}

/**
 * R10: date-consistency
 * 同一文章的所有语言版本中的 date 字段必须一致
 */
function checkR10(contentDir) {
  const slugs = {};
  const LOCALES = [
    "en","zh","es","fr","de","ja","pt","ru",
    "ar","ko","it","nl","tr","vi","id","th",
    "hi","pl","sv","el","cs","ro","hu","fi",
    "da","no","uk","bg","hr","sr","sk","sl",
    "ms","ka","he","sw","bn","ca",
    "fa","ur","ta","af","sq","az","hy","be","ne","si"
  ];

  for (const loc of LOCALES) {
    const dir = path.join(contentDir, loc);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".mdx"))) {
      const c = fs.readFileSync(path.join(dir, f), "utf-8");
      const m = c.match(/^date:\s*"(.+?)"/m);
      if (m) {
        const slug = f.replace(/\.mdx$/, "");
        if (!slugs[slug]) slugs[slug] = {};
        slugs[slug][loc] = m[1];
      }
    }
  }

  for (const [slug, dates] of Object.entries(slugs)) {
    const uniqueDates = [...new Set(Object.values(dates))];
    if (uniqueDates.length > 1) {
      const first = uniqueDates[0];
      const mismatches = Object.entries(dates)
        .filter(([, d]) => d !== first)
        .map(([loc, d]) => `${loc}:${d}`);
      addFinding({
        file: `apps/blog/content/*/${slug}.mdx`,
        lang: "-",
        rule: "R10",
        severity: "error",
        text: `日期不一致 - 多数为 "${first}", 差异: ${mismatches.join(", ")}`,
      });
    }
  }
}

// ============================================================
// 扫描主逻辑
// ============================================================
/**
 * R11: cta-format
 * CTA 链接格式验证
 */
function checkR11(content, relPath, lang) {
  const lines = content.trim().split('\n');
  const tailLines = lines.slice(-10);

  let ctaMatch = null;
  for (const line of tailLines) {
    const m = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (m) { ctaMatch = m; break; }
  }

  if (!ctaMatch) return;

  const [, linkText, linkUrl] = ctaMatch;
  const urlPath = linkUrl.replace(/^https?:\/\/[^\/]+/, '');

  // 1. URL must use /packages/ not /quote/
  if (urlPath.includes('/quote/')) {
    addFinding({ file: relPath, lang, rule: 'R11', severity: 'error', line: lines.length,
      text: linkUrl, description: 'CTA 链接路径含 /quote/，应使用 /packages/' });
  }

  // 2. URL locale prefix must match article locale (48-language aware)
  const expectedPrefix = '/' + lang + '/';
  if (!urlPath.startsWith(expectedPrefix)) {
    const wrongLocale = urlPath.match(/^\/(\w{2,5})\//);
    addFinding({ file: relPath, lang, rule: 'R11', severity: 'error', line: lines.length,
      text: linkUrl, description: lang + ' CTA 链接应使用 ' + expectedPrefix + ' 前缀，当前: /' + (wrongLocale ? wrongLocale[1] : '??') + '/' });
  }

  // 3. Link text validation per locale
  if (lang === 'zh') {
    if (linkText !== '联系我们') {
      addFinding({ file: relPath, lang, rule: 'R11', severity: 'error', line: lines.length,
        text: linkText, description: 'zh CTA 链接文本应为"联系我们"' });
    }
  } else if (lang === 'en') {
    if (!/^Contact us/i.test(linkText)) {
      addFinding({ file: relPath, lang, rule: 'R11', severity: 'error', line: lines.length,
        text: linkText, description: 'en CTA 链接文本应以"Contact us"开头' });
    }
  } else {
    // Skip CJK character check for Japanese/Korean (kanji/hanja are legitimate)
    const isCJKFallback = lang !== 'ja' && lang !== 'ko';
    if (isCJKFallback && /[\u4e00-\u9fff]/.test(linkText)) {
      addFinding({ file: relPath, lang, rule: 'R11', severity: 'error', line: lines.length,
        text: linkText, description: lang + ' CTA 文本含中文字符（疑似未翻译回退）' });
    }
    if (/^Contact us/i.test(linkText)) {
      addFinding({ file: relPath, lang, rule: 'R11', severity: 'error', line: lines.length,
        text: linkText, description: lang + ' CTA 文本为英语（疑似未翻译回退）' });
    }
  }
}

/**
 * R12: body-hr
 * 正文中不应出现分割线 <hr>（--- 行）
 */
function checkR12(content, relPath, lang) {
  const lines = content.split('\n');
  let fmStage = 0; // 0=before frontmatter, 1=in frontmatter, 2=after frontmatter (body)

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^---\s*$/.test(trimmed)) {
      if (fmStage === 0) { fmStage = 1; continue; }
      if (fmStage === 1) { fmStage = 2; continue; }
      // fmStage === 2: body === <hr>
      addFinding({ file: relPath, lang, rule: 'R12', severity: 'error', line: i + 1,
        text: '---', description: '正文中出现分割线（---）渲染为 <hr>' });
      continue;
    }
    if (fmStage < 2) continue;
  }
}

/**
 * R13: list-item-blank-line
 * 连续列表项之间不应有空白行
 */
function checkR13(content, relPath, lang) {
  const lines = content.split('\n');
  let fmStage = 0; // 0=before, 1=in, 2=after frontmatter
  let inCodeBlock = false;
  let prevIsListItem = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^---\s*$/.test(trimmed)) {
      if (fmStage === 0) { fmStage = 1; continue; }
      if (fmStage === 1) { fmStage = 2; continue; }
      continue; // body ---, skip for list checking
    }
    if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; continue; }
    if (fmStage < 2 || inCodeBlock) continue;
    if (/^#/.test(trimmed)) { prevIsListItem = false; continue; }

    const isListItem = /^\s*[-*]\s/.test(trimmed);
    const isEmpty = trimmed === '';

    if (isEmpty && prevIsListItem) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && /^\s*[-*]\s/.test(lines[j].trim())) {
        addFinding({ file: relPath, lang, rule: 'R13', severity: 'error', line: i + 1,
          text: '(空行)', description: '连续列表项之间有空白行，移除空行' });
      }
    }

    prevIsListItem = isListItem;
  }
}

/**
 * R14: category-unknown
 * 文章分类不在预设标签列表中
 */
function checkR14(content, relPath, lang) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return;
  const fm = fmMatch[1];
  const catMatch = fm.match(/^category:\s*(.+)$/m);
  if (!catMatch) return;

  const category = catMatch[1].trim().replace(/^["']|["']$/g, '');
  const ALLOWED = ['Brand Protection', 'Compliance Guide', 'Cosmetics', 'E-commerce', 'Food & Beverage', 'Label Compliance', 'Product Certification'];

  if (!ALLOWED.includes(category)) {
    addFinding({ file: relPath, lang, rule: 'R14', severity: 'error', line: 1,
      text: category, description: lang + ' 文章分类 "' + category + '" 不在预设列表中，允许值: ' + ALLOWED.join(', ') });
  }
}

/**
 * R15: list-items-inline
 * 多行列表项混在同一行（无换行）
 */
function checkR15(content, relPath, lang) {
  const lines = content.split('\n');
  let fmStage = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^---\s*$/.test(trimmed)) {
      if (fmStage === 0) { fmStage = 1; continue; }
      if (fmStage === 1) { fmStage = 2; continue; }
      continue;
    }
    if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; continue; }
    if (fmStage < 2 || inCodeBlock) continue;
    if (/^#/.test(trimmed)) continue;
    // Skip proper list items and empty lines
    if (/^\s*[-*]\s/.test(trimmed)) continue;
    if (/^\s*\d+\.\s/.test(trimmed)) continue;
    if (trimmed === '') continue;

    // Check for AI-style em-dash with spaces (space-emdash-space) in body text
    if (/ — /.test(trimmed)) {
      addFinding({ file: relPath, lang, rule: 'R15', severity: 'error', line: i + 1,
        text: trimmed.slice(0, 80), description: lang + ' 正文含 AI 风格破折号（空格+破折号+空格），应移除两侧空格' });
    }

    // Check for inline list items separated by wide spacing of emoji-like markers
    // e.g., "✅ Option A   ❌ Option B" (3+ spaces between emoji pairs)
    // This complements R03 which uses a different detection approach
    const spacedEmojiRe = /(\p{Emoji_Presentation})\s{3,}(\p{Emoji_Presentation})/u;
    if (spacedEmojiRe.test(trimmed)) {
      addFinding({ file: relPath, lang, rule: 'R15', severity: 'error', line: i + 1,
        text: trimmed.slice(0, 80), description: lang + ' 多图形列表项混在同一行，每个应独占一行' });
    }
  }
}

/**
 * R16: body-references
 * 正文中不应有 ## References 章节
 */
// Multi-language reference heading patterns
// Uses generic matching with common reference-related keywords
const REF_HEADING_RE = /^##\s+(?:Refer|Réf(?:érences?)?|Riferimenti|Hivatkozások|Verwysings|Viitteet|Rujukan|Marejeleo|İstinadlar|Παραπομπές|Αναφορ|Източни|Спасылкі|Референции|Препратки|Посилання|Ссылки|参考文献|참고|参考资料)/i;

function checkR16(content, relPath, lang) {
  const lines = content.split('\n');
  let fmStage = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^---\s*$/.test(trimmed)) {
      if (fmStage === 0) { fmStage = 1; continue; }
      if (fmStage === 1) { fmStage = 2; continue; }
      continue;
    }
    if (fmStage < 2) continue;

    if (REF_HEADING_RE.test(trimmed)) {
      addFinding({ file: relPath, lang, rule: 'R16', severity: 'error', line: i + 1,
        text: trimmed.slice(0, 40), description: '正文中包含参考文献小节，应使用 frontmatter references' });
    }
  }
}

/**
 * R17: ref-chinese-in-en
 * 英文文章参考链接标题含中文
 */
function checkR17(content, relPath, lang) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return;
  const fm = fmMatch[1];
  const refStart = fm.indexOf('references:');
  if (refStart < 0) return;

  const refSection = fm.substring(refStart);
  const titleRe = /- title:\s*"([^"]+)"/g;
  let m;
  while ((m = titleRe.exec(refSection)) !== null) {
    const title = m[1];

    // Chinese character detection for non-CJK locales
    const isCJK = lang === 'zh' || lang === 'ja' || lang === 'ko';
    if (isCJK) continue; // Chinese chars expected in zh/ja/ko

    if (/[\u4e00-\u9fff]/.test(title)) {
      addFinding({ file: relPath, lang, rule: 'R17', severity: 'error', line: 1,
        text: title.slice(0, 80), description: lang + ' 参考文献标题含中文字符（疑似未翻译），应翻译为对应语言' });
    }
  }
}

/**
 * R19: cta-link-length
 * 48 语言 CTA 链接格式——链接文本应为简短的联系短语，而非整句
 */
function checkR19(content, relPath, lang) {
  const lines = content.trim().split('\n');
  const tailLines = lines.slice(-10);

  let ctaMatch = null;
  let ctaLineIdx = -1;
  for (let i = tailLines.length - 1; i >= 0; i--) {
    const m = tailLines[i].match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (m && (m[2].includes('/packages/') || m[2].includes('/quote/'))) {
      ctaMatch = m;
      ctaLineIdx = lines.length - tailLines.length + i;
      break;
    }
  }

  if (!ctaMatch) return;

  const linkText = ctaMatch[1];
  const linkUrl = ctaMatch[2];

  // 1. Check link text length - should be short (contact phrase), not full sentence
  if (linkText.length > 50) {
    addFinding({ file: relPath, lang, rule: 'R19', severity: 'error', line: ctaLineIdx + 1,
      text: linkText.slice(0, 80) + (linkText.length > 80 ? '...' : ''),
      description: lang + ' CTA 链接文本过长（' + linkText.length + ' 字符），应为简短联系短语而非整句。格式应为 [联系短语](/locale/packages/) 剩余文字' });
    return;
  }

  // 2. For non-EN locales, check link text isn't English fallback
  if (lang !== 'en' && /^Contact us/i.test(linkText)) {
    addFinding({ file: relPath, lang, rule: 'R19', severity: 'error', line: ctaLineIdx + 1,
      text: linkText, description: lang + ' CTA 链接文本为英语（疑似未翻译回退）' });
  }
}

/**
 * R21: cta-locale-match
 * 文末 CTA 链接的语言前缀必须与文章语言一致
 * （例如 en 文章的 CTA 必须指向 /en/packages/，不能是 /zh/packages/ 等其它语言页面）
 */
function checkR21(content, relPath, lang) {
  const lines = content.trim().split('\n');
  const tailLines = lines.slice(-10);
  const expectedPrefix = '/' + lang + '/';

  for (const line of tailLines) {
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(line)) !== null) {
      const linkUrl = m[2];
      const urlPath = linkUrl.replace(/^https?:\/\/[^\/]+/, '');
      // 只检查 CTA 类链接（/packages/ 或 /quote/）
      if (!/\/packages\/|\/quote\//.test(urlPath)) continue;

      if (!urlPath.startsWith(expectedPrefix)) {
        const wrongLocale = urlPath.match(/^\/([a-z]{2,5})\//);
        addFinding({
          file: relPath,
          lang,
          rule: 'R21',
          severity: 'error',
          line: lines.length,
          text: linkUrl,
          description: lang + ' 文末 CTA 链接语言前缀不匹配，期望 ' + expectedPrefix + 'packages/，当前: /' + (wrongLocale ? wrongLocale[1] : '??') + '/packages/' + '（CTA 应链接到对应语言的页面）',
        });
      }
    }
  }
}

/**
 * R20: reference-title-translation
 * 检测非英文语种的参考文献标题是否未翻译（与英文版本完全一致）
 * 预计算所有英文文章的 frontmatter 参考文献标题用于对比
 */
function precomputeEnReferences(contentDir) {
  const enRefs = {};
  const enDir = path.join(contentDir, 'en');
  if (!fs.existsSync(enDir)) return enRefs;

  const files = fs.readdirSync(enDir).filter(f => f.endsWith('.mdx'));
  for (const file of files) {
    const filePath = path.join(enDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;

    const fm = fmMatch[1];
    const refStart = fm.indexOf('references:');
    if (refStart < 0) continue;

    const refSection = fm.substring(refStart);
    const titleRe = /- title:\s*"([^"]+)"/g;
    const titles = [];
    let m;
    while ((m = titleRe.exec(refSection)) !== null) {
      titles.push(m[1]);
    }

    if (titles.length > 0) {
      enRefs[file] = titles;
    }
  }

  return enRefs;
}

function checkR20(content, relPath, lang, enRefs) {
  // Non-EN only
  if (lang === 'en' || !enRefs) return;

  const fileName = path.basename(relPath);
  const enTitles = enRefs[fileName];
  if (!enTitles || enTitles.length === 0) return;

  // 专有名词前缀白名单——这些已知首字母缩略词/专有名词在不同语种中可保持原文
  const PROPER_NOUN_PREFIXES = [
    'CSAR',
    'NMPA',
    'KOTRA',
  ];

  // Parse local reference titles
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return;

  const fm = fmMatch[1];
  const refStart = fm.indexOf('references:');
  if (refStart < 0) return;

  const refSection = fm.substring(refStart);
  const titleRe = /- title:\s*"([^"]+)"/g;
  const localTitles = [];
  let m;
  while ((m = titleRe.exec(refSection)) !== null) {
    localTitles.push(m[1]);
  }

  if (localTitles.length === 0 || localTitles.length !== enTitles.length) return;

  // Compare each title against the EN version
  let matchCount = 0;
  for (let i = 0; i < enTitles.length; i++) {
    if (enTitles[i] === localTitles[i]) {
      matchCount++;
      // 跳过专有名词前缀的标题（如 CSAR — ..., NMPA — ..., KOTRA — ...）
      const titleTrimmed = localTitles[i].trim();
      const isProperNoun = PROPER_NOUN_PREFIXES.some(prefix =>
        titleTrimmed.startsWith(prefix + ' — ') || titleTrimmed.startsWith(prefix + ' —')
      );
      if (isProperNoun) continue;

      // Only flag if the title has substantive text (not just a standard number)
      const stripped = enTitles[i].replace(/^[A-Z]{2,5}\s+[\d-]+\s*[—\-]?\s*/, '');
      if (stripped.length > 15) {
        addFinding({ file: relPath, lang, rule: 'R20', severity: 'error', line: 1,
          text: localTitles[i].slice(0, 80),
          description: lang + ' 参考文献标题与英文版完全相同（疑似未翻译），应为 ' + lang + ' 语言版本' });
      }
    }
  }
}

function runAllChecks() {
  const contentDir = getContentDir(project);
  if (!contentDir || !fs.existsSync(contentDir)) {
    console.log(`⚠️  Content directory for "${project}" not found.`);
    return;
  }

  const langs = fs.readdirSync(contentDir).filter(d =>
    fs.statSync(path.join(contentDir, d)).isDirectory(),
  );

  // ── 全局规则（R07, R09）──
  // ── 预计算英文参考文献标题用于 R20 对比 ──
  const enRefs = precomputeEnReferences(contentDir);

  if (!filterLang) {
    if (!filterRule || filterRule === 'R07') checkR07(contentDir);
    if (!filterRule || filterRule === 'R09') {
      const msgDir = getBlogMessagesDir();
      if (fs.existsSync(msgDir)) checkR09(contentDir, msgDir);
    }
    if (!filterRule || filterRule === 'R10') checkR10(contentDir);
  }

  // ── 每文件规则（R01-R06, R08）──
  for (const lang of langs) {
    if (filterLang && lang !== filterLang) continue;

    const rulesToRun = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11', 'R12', 'R13', 'R14', 'R16', 'R17', 'R19', 'R20', 'R21'];
    // 如果指定了 filterRule，只运行那一条
    const activeRules = filterRule
      ? (rulesToRun.includes(filterRule) ? [filterRule] : [])
      : rulesToRun;

    if (activeRules.length === 0) continue;

    const langDir = path.join(contentDir, lang);
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.mdx'));

    for (const file of files) {
      const filePath = path.join(langDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(repoRoot, filePath);
      totalFiles++;

      for (const ruleId of activeRules) {
        switch (ruleId) {
          case 'R01': checkR01(content, relPath, lang); break;
          case 'R02': checkR02(content, relPath, lang); break;
          case 'R03': checkR03(content, relPath, lang); break;
          case 'R04': checkR04(content, relPath, lang); break;
          case 'R05': checkR05(content, relPath, lang); break;
          case 'R06': checkR06(content, relPath, lang); break;
          case 'R08': checkR08(content, relPath, lang); break;
          case 'R11': checkR11(content, relPath, lang); break;
          case 'R12': checkR12(content, relPath, lang); break;
          case 'R13': checkR13(content, relPath, lang); break;
          case 'R14': checkR14(content, relPath, lang); break;
          case 'R16': checkR16(content, relPath, lang); break;
          case 'R17': checkR17(content, relPath, lang); break;
          case 'R19': checkR19(content, relPath, lang); break;
          case 'R20': checkR20(content, relPath, lang, enRefs); break;
          case 'R21': checkR21(content, relPath, lang); break;
        }
      }
    }
  }
}

// ============================================================
// 输出
// ============================================================
function printResults() {
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  文章 MDX 内容质量检查 (${project})`);
  console.log(`═══════════════════════════════════════════════\n`);

  if (findings.length === 0) {
    console.log('✅ 未发现问题');
    console.log(`  扫描文件: ${totalFiles}`);
    return true;
  }

  // 按规则分组
  const byRule = {};
  for (const f of findings) {
    const r = f.rule || 'GLOBAL';
    if (!byRule[r]) byRule[r] = [];
    byRule[r].push(f);
  }

  const RULE_META = {
    R01: { severity: 'error', desc: '标题间过多空行（最多 1 行）' },
    R02: { severity: 'error', desc: '列表项间过多空行（最多 1 行）' },
    R03: { severity: 'error', desc: 'Emoji 图形列表项混在一行' },
    R04: { severity: 'error', desc: '标题语法错误（# 或 ####+ 或缺少空格）' },
    R05: { severity: 'error', desc: '禁止字符画流程图/路线图' },
    R06: { severity: 'error', desc: '缺少联系我们/免费评估结尾' },
    R07: { severity: 'error', desc: '48 语言翻译版本不完整' },
    R08: { severity: 'error', desc: '标题含冒号/破折号/连字符' },
    R09: { severity: 'error', desc: '分类标签缺少 48 语言翻译键' },
    R10: { severity: 'error', desc: '文章日期在 48 语言中不一致' },
    R11: { severity: 'error', desc: 'CTA 链接格式异常' },
    R12: { severity: 'error', desc: '正文中出现 <hr> 分割线' },
    R13: { severity: 'error', desc: '列表项之间有空白行（破坏渲染）' },
    R14: { severity: 'error', desc: '文章分类不在预设标签列表中' },
    R15: { severity: 'error', desc: '列表项混在同一行（暂未启用，需精炼规则）' },
    R16: { severity: 'error', desc: '正文中有 ## References（应使用 frontmatter）' },
    R17: { severity: 'error', desc: '英文文章参考含中文未翻译' },
    R19: { severity: 'error', desc: 'CTA 链接文本为整句而非简短联系短语' },
    R20: { severity: 'error', desc: '非英文语种参考文献标题与英文版完全相同（疑似未翻译）' },
    R21: { severity: 'error', desc: '文末 CTA 链接语言前缀与文章语言不匹配' },
  };

  for (const [ruleId, items] of Object.entries(byRule)) {
    const meta = RULE_META[ruleId];
    const icon = meta?.severity === 'error' ? '❌' : '⚠️';
    const errCount = items.filter(i => i.severity === 'error').length;
    const warnCount = items.filter(i => i.severity === 'warning').length;

    console.log(`\n┌─ ${icon} [${ruleId}] ${meta?.desc || ''}`);
    console.log(`│  共 ${items.length} 条（${errCount} 错误${warnCount > 0 ? `, ${warnCount} 警告` : ''}）`);

    // 每个规则最多显示 20 条
    const displayItems = items.length > 20 ? items.slice(0, 20) : items;
    for (const item of displayItems) {
      const loc = item.line ? `:${item.line}` : '';
      console.log(`│  ${icon} ${item.file}${loc}`);
      if (item.text) console.log(`│     ${item.text}`);
    }
    if (items.length > 20) {
      console.log(`│  … 还有 ${items.length - 20} 条`);
    }
    console.log(`└─`);
  }

  console.log(`\n  扫描文件: ${totalFiles}  错误: ${totalErrors}  警告: ${totalWarnings}`);
  return totalErrors === 0;
}

// ============================================================
// 主入口
// ============================================================
runAllChecks();
const passed = printResults();
console.log('');

if (isCi && !passed) {
  process.exit(1);
}
