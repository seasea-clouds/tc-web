#!/usr/bin/env node
/**
 * 翻译质量全量核验脚本
 * Replaces scripts/check-translations.py — pure Node.js, no Python.
 *
 * 每次翻译执行完成后运行，检查 48 种语言的翻译质量。
 * 检查项：
 * 1. 英文 fallback 检测
 * 2. 空值检测
 * 3. 目标语言字符检测
 * 4. 不应翻译词表检查
 * 5. 短词特殊检查
 * 6. 非拉丁语言英文残留检测
 * 7. 输出详细报告
 *
 * 使用方法：
 *   node scripts/check-translations.mjs
 *   node scripts/check-translations.mjs --lang zh
 *   node scripts/check-translations.mjs --short
 */
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');
const BLOG_DIR = path.join(PROJECT_ROOT, 'content', 'blog');

// ============================================================
// 不应翻译的词表
// ============================================================
const NO_TRANSLATE = new Set([
  'WhatsApp', 'WeChat', 'LinkedIn', 'Facebook', 'Twitter', 'YouTube',
  'SinoTrade Compliance', 'Global Trade Network', 'FAQ', 'Go-to-Market',
  'David Zhang', 'Sarah Chen', 'Mike Wang', 'Leo Liu',
  'GB 7718-2025', 'you@company.com', 'John Smith',
  'GACC', 'NMPA', 'CCC', 'CBEC', 'CIFER', 'MOA', 'CNCA', 'MEE', 'min',
]);

const IGNORE_FALLBACK_KEYS = new Set([
  'Packages.nmpaCosmeticsFiling', 'Packages.piplDataCompliance',
  'Packages.premiumItems4', 'Packages.advancedName', 'Packages.comparisonFeature',
  'Services.gaccTitle', 'Services.jsonldName', 'ServiceCosmetics.jsonldName',
  'ServiceCosmetics.jsonldServiceType', 'ServiceCosmetics.serviceType',
  'IndustryEcommerce.questionsTitle', 'IndustryEcommerce.jsonldName',
  'IndustryMedical.coverItems7', 'IndustryCosmetics.coverItems1',
  'ThankYou.serviceCosmetics', 'Blog.service_cosmetics',
  'IndustriesCommon.industries.babymaternal',
  'Navbar.industriesDropdown.babymaternal',
  'Navbar.servicesDropdown.gacc', 'Home.industry.babymaternal',
]);

const IGNORE_FALLBACK_VALUES = new Set([
  'NMPA Cosmetics Filing', 'NMPA cosmetics filing and registration support',
  'PIPL Data Compliance Assessment', 'GACC Food Registration',
  'China Import Compliance Services', 'Medical device compliance training and advisory',
  'Baby & Maternal',
  'Free Check',
]);

const NUMBER_KEYS = new Set([
  'Home.stat1Number', 'Home.stat2Number', 'Home.stat3Number', 'Home.stat4Number',
  'ThankYou.stat1Number', 'ThankYou.stat2Number', 'ThankYou.stat3Number', 'ThankYou.stat4Number',
]);
const NAME_KEYS = new Set([
  'About.expertName', 'About.teamMember1Name', 'About.teamMember2Name',
  'About.teamMember3Name', 'About.teamMember4Name', 'Blog.author',
  'Quote.namePlaceholder',
]);
const PLACEHOLDER_KEYS = new Set(['ContactForm.emailPlaceholder', 'Quote.emailPlaceholder']);
const STANDARD_KEYS = new Set(['DefinitionSchema.gb7718Name']);
const JSON_LD_KEYS = new Set(['OrganizationJsonLd.sameAs', 'OrganizationJsonLd.availableLanguage']);

const SHORT_WORD_WHITELIST = new Set([
  'Navbar.home|首页', 'Navbar.home|ホーム', 'Navbar.home|홈',
  'Navbar.home|الرئيسية', 'Navbar.home|Accueil', 'Navbar.home|Startseite',
  'Navbar.home|Inicio', 'Navbar.home|Главная',
  'Navbar.about|关于', 'Navbar.about|会社概要', 'Navbar.about|소개',
  'Navbar.about|حول', 'Navbar.about|À propos', 'Navbar.about|Über',
  'Navbar.services|服务', 'Navbar.services|サービス', 'Navbar.services|서비스',
  'Footer.services|服务', 'Footer.services|サービス', 'Footer.services|서비스',
  'Navbar.packages|套餐', 'Navbar.packages|パッケージ', 'Navbar.packages|패키지',
  'Navbar.blog|洞察', 'Navbar.blog|インサイト', 'Navbar.blog|인사이트',
  'Search.title|搜索', 'Search.title|検索', 'Search.title|검색',
]);

// ============================================================
// 目标语言字符范围检测
// ============================================================
function hasCharRange(s, ranges) {
  for (const c of s) {
    const code = c.codePointAt(0);
    for (const [min, max] of ranges) {
      if (code >= min && code <= max) return true;
    }
  }
  return false;
}

const LANG_CHAR_CHECKS = {
  zh:   { name: '中文', ranges: [[0x4e00, 0x9fff]], desc: 'CJK 字符' },
  ja:   { name: '日文', ranges: [[0x3040, 0x309f], [0x30a0, 0x30ff], [0x4e00, 0x9fff]], desc: '日文（汉字/假名）' },
  ko:   { name: '韩文', ranges: [[0xac00, 0xd7af]], desc: '韩文字母' },
  ar:   { name: '阿拉伯文', ranges: [[0x0600, 0x06ff]], desc: '阿拉伯字符' },
  ru:   { name: '俄文', ranges: [[0x0400, 0x04ff]], desc: '西里尔字母' },
  el:   { name: '希腊文', ranges: [[0x0370, 0x03ff]], desc: '希腊字母' },
  he:   { name: '希伯来文', ranges: [[0x0590, 0x05ff]], desc: '希伯来字符' },
  th:   { name: '泰文', ranges: [[0x0e00, 0x0e7f]], desc: '泰文字符' },
  hi:   { name: '印地文', ranges: [[0x0900, 0x097f]], desc: '梵文字母' },
  uk:   { name: '乌克兰文', ranges: [[0x0400, 0x04ff]], desc: '西里尔字母' },
  bg:   { name: '保加利亚文', ranges: [[0x0400, 0x04ff]], desc: '西里尔字母' },
  sr:   { name: '塞尔维亚文', ranges: [[0x0400, 0x04ff]], desc: '西里尔/拉丁' },
};

const NON_LATIN_LOCALES = new Set([
  'zh', 'ja', 'ko', 'ar', 'he', 'ru', 'uk', 'bg', 'sr', 'be',
  'el', 'th', 'hi', 'bn', 'ne', 'si', 'ta', 'ka', 'hy', 'fa', 'ur',
]);

const SHORT_WORD_KEYS = new Set([
  'Navbar.home', 'Footer.contact', 'Navbar.services', 'Footer.services',
  'Navbar.whatsapp', 'Footer.whatsapp', 'Navbar.logo', 'Navbar.about',
  'Navbar.packages', 'Navbar.blog', 'Navbar.faq', 'Navbar.contact',
  'Search.placeholder', 'Search.title', 'ThankYou.title', 'ThankYou.subtitle',
  'CTA.ctaTitle', 'CTA.ctaSubtitle', 'CTA.ctaUrgency',
  'Footer.contact', 'Footer.services', 'Footer.gaccRegistration',
]);

const SHARED_WORDS_ALL = new Set([
  'Blog', 'Audit', 'Legal', 'Insights', 'Categories', 'Feature',
  'Home', 'Contact', 'Expertise', 'E-commerce',
  'Compliance Rate', 'Insights & Compliance Guides',
]);

const SHARED_WORDS_BY_LANG = {
  fr: new Set(['Services', 'Contact', 'Blog', 'Page', 'Message', 'Audit', 'Legal']),
  de: new Set(['Blog', 'Legal']),
  nl: new Set(['Blog', 'Contact']),
  sv: new Set(['Blog', 'Contact', 'Services']),
  da: new Set(['Blog', 'Contact', 'Services']),
  no: new Set(['Blog', 'Contact', 'Services']),
  es: new Set(['Blog', 'Contact', 'Services']),
  it: new Set(['Blog', 'Contact', 'Services']),
  pt: new Set(['Blog', 'Contact', 'Services']),
};
// Blog is universal
for (const lang of ['af','az','ca','cs','el','fi','hr','hu','id','ka','ms','pl','ro','si','sk','sl','sq','sw','tr','vi']) {
  if (!SHARED_WORDS_BY_LANG[lang]) SHARED_WORDS_BY_LANG[lang] = new Set();
  SHARED_WORDS_BY_LANG[lang].add('Blog');
}

const ENGLISH_RESIDUAL_ALLOW = new Set([
  ...NO_TRANSLATE, ...SHARED_WORDS_ALL,
  'Tmall', 'JD', 'Douyin', 'TikTok', 'RED', 'Pinduoduo', 'Xiaohongshu',
  'Kaola', 'Little', 'Red', 'Book', 'Worldwide', 'Global', 'China',
  'Alipay', 'Pay', 'WeChat',
  'YouTube', 'Instagram', 'Threads', 'Facebook', 'Twitter',
  'SinoTrade', 'Compliance', 'Mini', 'App', 'Partner', 'Partners',
  'Platform', 'Platforms', 'Brands', 'Brand', 'brands',
  'Cosmetics', 'Filing', 'Certification', 'Compulsory',
  'Enterprise', 'Import', 'Registration',
  'Administration', 'Medical', 'National', 'Products',
  'Label', 'Labels', 'Labeling', 'Market', 'Setup',
  'Logistics', 'Payments', 'One', 'Stop',
  'file', 'first', 'common', 'entering', 'international', 'strategy', 'supplement',
  'Email', 'email', 'spam', 'Western', 'smartphone', 'Supplement',
  'Saznajte', 'Map', 'Site', 'Web',
  'Additive', 'sulfite', 'feed',
  'Standard', 'Nutrition', 'Prepackaged',
  'VAT', 'MRL', 'FTA', 'Bluetooth', 'Class', 'FAQs',
  'Food', 'Chinese', 'Review', 'Launch', 'Regulation', 'premium',
  'End', 'Decrees', 'commerce', 'Commerce', 'squatting',
  'David', 'Sarah', 'Mike', 'Leo', 'John', 'Zhang', 'Jing',
  'Decree', 'SAMR', 'CNCA', 'MEE', 'CNIPA', 'SRRC', 'QMS', 'FSSC', 'SDS',
  'CIQ', 'HACCP', 'CNAS', 'SDOC', 'GMP', 'CRA', 'FMCG',
  'PIPL', 'CSAR', 'CIFER', 'MOA', 'FTAs', 'INCI', 'Big', 'Four',
  'III', 'GDPR', 'IP', 'SKU', 'ISBN', 'SGS', 'ISO', 'HTML',
  'VIP', 'CEO', 'CTO', 'COO', 'CFO',
  'Onboarding', 'onboarding', 'substantiation',
  'Phytosanitary', 'Customs', 'Intellectual', 'Property', 'Commission', 'Supervision',
  'General', 'State', 'Radio', 'Recordal',
  'Entry', 'Order', 'Law', 'Protection', 'Information', 'Personal',
  'Class', 'FAQ',
  'com', 'http', 'https', 'www', 'API',
  'for', 'and', 'This', 'About',
  'Telegram',
]);

// ============================================================
// Helpers
// ============================================================
function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v, p));
    } else {
      result[p] = v;
    }
  }
  return result;
}

// ============================================================
// Blog MDX check
// ============================================================
function checkBlogMdx(targetLang = null, verbose = true) {
  const slugList = [];
  // Graceful: blog content may not exist in this project root (e.g. blog app)
  const enDir = path.join(BLOG_DIR, 'en');
  if (!fs.existsSync(BLOG_DIR) || !fs.existsSync(enDir)) {
    if (verbose) console.log(`\n📝 博客 MDX 检查: ⏭️ 跳过 (${BLOG_DIR} 不存在)`);
    return 0;
  }
    for (const f of fs.readdirSync(enDir).filter(f => f.endsWith('.mdx')).sort()) {
      slugList.push(path.basename(f, '.mdx'));
    }

  const allLangs = targetLang
    ? (fs.existsSync(path.join(BLOG_DIR, targetLang)) ? [targetLang] : [])
    : fs.readdirSync(BLOG_DIR).filter(d => fs.statSync(path.join(BLOG_DIR, d)).isDirectory() && d !== 'en').sort();

  let issues = 0;
  const issueDetail = [];

  for (const slug of slugList) {
    for (const locale of allLangs) {
      const mdxFile = path.join(BLOG_DIR, locale, `${slug}.mdx`);
      if (!fs.existsSync(mdxFile)) continue;

      const content = fs.readFileSync(mdxFile, 'utf-8');
      if (!content.startsWith('---')) continue;
      const parts = content.split('---', 3);
      if (parts.length < 3) continue;
      const fm = parts[1];
      const body = parts[2];

      // 1. header missing space
      for (const [i, line] of body.split('\n').entries()) {
        if (/^#{1,6}[^#\s]/.test(line.trim())) {
          issues++; issueDetail.push([locale, slug, `L${i + 1}: header missing space`, line.trim().slice(0, 60)]);
        }
      }

      // 2. ref title English
      if (locale !== 'en') {
        const enRefTitles = [
          'GACC — General Administration of Customs of China',
          'NMPA — National Medical Products Administration',
          'CNCA — Certification and Accreditation Administration of China',
          'SAMR — State Administration for Market Regulation',
          'CIFER — China Import Food Enterprise Registration System',
          'CNIPA — China National Intellectual Property Administration',
        ];
        for (const t of enRefTitles) {
          if (fm.includes(t)) {
            issues++; issueDetail.push([locale, slug, 'ref title English', t.slice(0, 50)]);
            break;
          }
        }
      }

      // 3. inline ## in paragraph
      for (const [i, line] of body.split('\n').entries()) {
        if (line.includes('##') && !line.trim().startsWith('#')) {
          const idx = line.indexOf('##');
          const before = line.slice(Math.max(0, idx - 1), idx);
          if (before && !/^\s*$/.test(before)) {
            issues++; issueDetail.push([locale, slug, `L${i + 1}: inline ## in paragraph`, line.slice(Math.max(0, idx - 5), idx + 30).trim()]);
            break;
          }
        }
      }

      // 4. stray # line
      for (const [i, line] of body.split('\n').entries()) {
        const s = line.trim();
        if (s && /^#+$/.test(s) && s.length <= 2) {
          issues++; issueDetail.push([locale, slug, `L${i + 1}: stray # line`, line.slice(0, 40)]);
          break;
        }
      }

      // 5. table sep columns mismatch
      const lines = body.split('\n');
      for (const [i, line] of lines.entries()) {
        const s = line.trim();
        if (s.startsWith('|') && s.includes('---')) {
          const sepCols = (s.match(/\|/g) || []).length - 1;
          if (sepCols === 0) continue;
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            if (lines[j].trim() && lines[j].trim().startsWith('|') && !lines[j].includes('---')) {
              const dataCols = (lines[j].trim().match(/\|/g) || []).length - 1;
              if (dataCols !== sepCols) {
                issues++; issueDetail.push([locale, slug, `L${i + 1}: table sep ${sepCols} cols ≠ ${dataCols} in data`, s.slice(0, 60)]);
              }
              break;
            }
          }
        }
      }

      // 6. bold not closed
      for (const [i, line] of body.split('\n').entries()) {
        const s = line.trim();
        if (!s || s.startsWith('|') || s.includes('http')) continue;
        const boldCount = (s.match(/\*\*/g) || []).length;
        if (boldCount % 2 !== 0) {
          issues++; issueDetail.push([locale, slug, `L${i + 1}: bold not closed (${boldCount} **)`, s.slice(0, 70)]);
          break;
        }
      }

      // 7. coverImage still in frontmatter
      if (fm.includes('coverImage')) {
        issues++; issueDetail.push([locale, slug, 'coverImage still in frontmatter', '']);
      }

      // 8. frontmatter required fields
      for (const field of ['title', 'excerpt']) {
        let val = '';
        for (const l of fm.split('\n')) {
          const ls = l.trim();
          if (ls.startsWith(field + ':')) {
            val = ls.slice(field.length + 1).trim().replace(/^["']|["']$/g, '');
            break;
          }
        }
        if (!val) {
          issues++; issueDetail.push([locale, slug, `${field} is empty`, '']);
          break;
        }
      }

      // 9. list dash missing space
      for (const [i, line] of body.split('\n').entries()) {
        if (/^\s*-[^-\[\]\s]/.test(line)) {
          issues++; issueDetail.push([locale, slug, `L${i + 1}: list dash missing space`, line.trim().slice(0, 60)]);
          break;
        }
      }

      // 10. fullwidth pipe
      for (const [i, line] of body.split('\n').entries()) {
        if (line.includes('\uff5c')) {
          issues++; issueDetail.push([locale, slug, `L${i + 1}: fullwidth pipe U+FF5C`, line.trim().slice(0, 60)]);
          break;
        }
      }
    }
  }

  if (verbose) {
    if (issueDetail.length) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 博客 MDX 检查 (${issueDetail.length} 个问题):`);
      for (const [loc, sl, typ, detail] of issueDetail) {
        console.log(`  [${loc}] ${sl}: ${typ} — ${detail}`);
      }
    } else {
      console.log(`\n${'='.repeat(60)}`);
      console.log('📝 博客 MDX 检查: ✅ 所有文章格式正确');
    }
  }

  return issues;
}

// ============================================================
// Translation check
// ============================================================
function checkTranslations(targetLang = null, verbose = true) {
  const enPath = path.join(MESSAGES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.log(`❌ 找不到英文源文件: ${enPath}`);
    return null;
  }

  const enFlat = flattenKeys(loadJSON(enPath));

  const allLangs = fs.readdirSync(MESSAGES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'en.json')
    .map(f => path.basename(f, '.json'))
    .sort();

  const langsToCheck = targetLang
    ? (allLangs.includes(targetLang) ? [targetLang] : [])
    : allLangs;

  const totalIssues = { count: 0, byType: { fallback: [], empty: [], wrong_chars: [], no_translate_translated: [], short_word_issues: [], english_residual: [] } };

  if (verbose) {
    console.log('🔍 翻译质量核验');
    console.log(`   语言: ${langsToCheck.length}/47`);
    console.log(`   英文 key 数: ${Object.keys(enFlat).length}`);
    console.log('='.repeat(60));
  }

  for (const lang of langsToCheck) {
    const langPath = path.join(MESSAGES_DIR, `${lang}.json`);
    if (!fs.existsSync(langPath)) continue;

    const langFlat = flattenKeys(loadJSON(langPath));
    let langIssues = 0;

    for (const [key, enVal] of Object.entries(enFlat)) {
      if (typeof enVal !== 'string' || enVal.length <= 2) continue;
      const langVal = langFlat[key] ?? '';

      // Skip special keys
      if (NUMBER_KEYS.has(key) || JSON_LD_KEYS.has(key) || NAME_KEYS.has(key) || PLACEHOLDER_KEYS.has(key) || STANDARD_KEYS.has(key)) continue;

      // 1. empty
      if (langVal === '') { totalIssues.byType.empty.push([lang, key]); langIssues++; continue; }

      // 2. fallback
      if (langVal === enVal) {
        if (!NO_TRANSLATE.has(enVal) && !IGNORE_FALLBACK_KEYS.has(key) && !IGNORE_FALLBACK_VALUES.has(enVal)) {
          let isShared = SHARED_WORDS_ALL.has(enVal);
          if (!isShared && SHARED_WORDS_BY_LANG[lang]?.has(enVal)) isShared = true;
          if (!isShared) {
            const stripped = enVal.replace(/[^\w\s]/g, '').trim();
            if (SHARED_WORDS_ALL.has(stripped) || SHARED_WORDS_BY_LANG[lang]?.has(stripped)) isShared = true;
          }
          if (!isShared && key.startsWith('DefinitionSchema.')) isShared = true;
          if (!isShared) {
            totalIssues.byType.fallback.push([lang, key, enVal]);
            langIssues++;
          }
        }
        continue;
      }

      // 3. no-translate translated
      if (NO_TRANSLATE.has(enVal) && langVal !== enVal) {
        totalIssues.byType.no_translate_translated.push([lang, key, enVal, langVal]);
        langIssues++;
        continue;
      }

      // 4. wrong chars
      if (LANG_CHAR_CHECKS[lang]) {
        const { ranges, desc } = LANG_CHAR_CHECKS[lang];
        if (!hasCharRange(langVal, ranges) && /[a-zA-Z]/.test(langVal)) {
          totalIssues.byType.wrong_chars.push([lang, key, langVal, desc]);
          langIssues++;
        }
      }

      // 5. short word
      if (SHORT_WORD_KEYS.has(key) && enVal.length <= 15) {
        if (!SHORT_WORD_WHITELIST.has(`${key}|${langVal}`) && (langVal.length <= 2 || langVal === enVal)) {
          if (!NO_TRANSLATE.has(enVal)) {
            totalIssues.byType.short_word_issues.push([lang, key, enVal, langVal]);
            langIssues++;
          }
        }
      }

      // 6. english residual in non-latin
      if (NON_LATIN_LOCALES.has(lang)) {
        const engWords = new Set((langVal.match(/\b[A-Za-z]{3,}\b/g) || []));
        if (engWords.size) {
          let residual = new Set([...engWords].filter(w => !ENGLISH_RESIDUAL_ALLOW.has(w)));
          if (SHARED_WORDS_BY_LANG[lang]) {
            residual = new Set([...residual].filter(w => !SHARED_WORDS_BY_LANG[lang].has(w)));
          }
          if (residual.size) {
            totalIssues.byType.english_residual.push([lang, key, [...residual].sort()]);
            langIssues++;
          }
        }
      }
    }

    totalIssues.count += langIssues;
    if (verbose) {
      console.log(`  ${langIssues === 0 ? '✅' : '⚠️'} ${lang}: ${langIssues} 个问题`);
    }
  }

  if (verbose) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 总计: ${totalIssues.count} 个问题`);

    const typeNames = {
      fallback: '❌ 英文 fallback',
      empty: '❌ 空值',
      wrong_chars: '⚠️ 非目标语言字符',
      no_translate_translated: '⚠️ 不应翻译的词被翻译了',
      short_word_issues: '⚠️ 短词翻译可疑',
      english_residual: '❌ 非拉丁语言英文残留',
    };

    for (const [type, items] of Object.entries(totalIssues.byType)) {
      if (!items.length) continue;
      console.log(`\n${typeNames[type] || type} (${items.length} 处):`);
      for (const item of items.slice(0, 30)) {
        if (type === 'fallback') console.log(`  [${item[0]}] ${item[1]} → ${item[2].slice(0, 60)}`);
        else if (type === 'empty') console.log(`  [${item[0]}] ${item[1]} → 空值`);
        else if (type === 'wrong_chars') console.log(`  [${item[0]}] ${item[1]} → ${item[2].slice(0, 60)} (缺少 ${item[3]})`);
        else if (type === 'no_translate_translated') console.log(`  [${item[0]}] ${item[1]} → 应保留 '${item[2]}' 但翻译成了 '${item[3].slice(0, 60)}'`);
        else if (type === 'short_word_issues') console.log(`  [${item[0]}] ${item[1]} → EN='${item[2]}' → ${item[3].slice(0, 60)}`);
        else if (type === 'english_residual') console.log(`  [${item[0]}] ${item[1]} → 英文残留: ${item[2].slice(0, 10).join(', ')}`);
      }
      if (items.length > 30) console.log(`  ... 还有 ${items.length - 30} 条`);
    }
  }

  return {
    total_issues: totalIssues.count,
    issues_by_type: Object.fromEntries(Object.entries(totalIssues.byType).map(([k, v]) => [k, v.length])),
    details: totalIssues.byType,
  };
}

// ============================================================
// 语种一致性检查
// 确保 messages/ 目录的 locale 文件与 canonical 48 种语言一致
// ============================================================
const CANONICAL_LOCALES = [
  'af','ar','az','be','bg','bn','ca','cs','da','de','el','en','es','fa','fi',
  'fr','he','hi','hr','hu','hy','id','it','ja','ka','ko','ms','ne','nl','no',
  'pl','pt','ro','ru','si','sk','sl','sq','sr','sv','sw','ta','th','tr','uk',
  'ur','vi','zh',
];

function checkLocaleConsistency(verbose = true) {
  const files = fs.readdirSync(MESSAGES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'en.json')
    .map(f => path.basename(f, '.json'))
    .sort();

  const actual = new Set(files);
  const canonical = new Set(CANONICAL_LOCALES.filter(l => l !== 'en'));

  const extra = [...actual].filter(l => !canonical.has(l)).sort();
  const missing = [...canonical].filter(l => !actual.has(l)).sort();

  if (verbose && (extra.length || missing.length)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔢 语种一致性检查:');
    if (extra.length) console.log(`  ❌ 多余语言文件 (${extra.length}): ${extra.join(', ')}`);
    if (missing.length) console.log(`  ❌ 缺少语言文件 (${missing.length}): ${missing.join(', ')}`);
  } else if (verbose && !extra.length && !missing.length) {
    console.log(`\n🔢 语种一致性检查: ✅ ${files.length}/47 语言匹配`);
  }

  return { total: extra.length + missing.length, extra, missing, actualCount: files.length };
}

// ============================================================
// CLI
// ============================================================
const args = process.argv.slice(2);
const targetLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const short = args.includes('--short');
const jsonOut = args.includes('--json');
const skipConsistency = args.includes('--skip-locale-check');

const localeCheck = skipConsistency ? null : checkLocaleConsistency(!short);
const result = checkTranslations(targetLang, !short);
const blogIssues = checkBlogMdx(targetLang, !short);

if (jsonOut && result) {
  console.log(JSON.stringify(result.issues_by_type, null, 2));
}

const totalIssues = (result?.total_issues ?? 0) + blogIssues + (localeCheck?.total ?? 0);

if (totalIssues === 0) {
  console.log('\n✅ 全量核验通过！48 种语言无质量问题。');
} else {
  console.log(`\n⚠️ 发现 ${totalIssues} 个问题`);
  if (localeCheck && localeCheck.total > 0) {
    console.log(`   - 语种一致性: ${localeCheck.total} 个问题 (多余: ${localeCheck.extra.length}, 缺少: ${localeCheck.missing.length})`);
  }
  if (result && result.total_issues > 0) {
    console.log(`   - 翻译质量: ${result.total_issues} 个问题`);
  }
  if (blogIssues > 0) {
    console.log(`   - 博客 MDX: ${blogIssues} 个问题`);
  }
  process.exit(1);
}
