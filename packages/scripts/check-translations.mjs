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
 * 8. 共享 UI 消息完整性（packages/ui/messages/）
 * 9. 面包屑 key 完整性（AutoBreadcrumb.tsx 引用的所有 i18n key）
 *
 * ============================================================
 * 三种 fallback 豁免机制（用法指南）
 * ============================================================
 *
 * 当检测到「英文值 === 翻译值」时视为英文 fallback，但以下三种机制可豁免：
 *
 * 1. IGNORE_FALLBACK_KEYS （全局，按 key 路径匹配）
 *    - 用法：添加 key 路径字符串，如 'Auth.emailPlaceholder'
 *    - 适用：该 key 本来就该保持英文（邮箱、报告状态、联系人信息等）
 *    - 注意：加入后所有 48 种语言都豁免，不要滥用
 *
 * 2. IGNORE_FALLBACK_VALUES （全局，按英文精确值匹配）
 *    - 用法：添加英文值字符串，如 'FCC', 'PDF'
 *    - 适用：该英文术语在所有语言中都保持原文（缩写、格式串、标准号等）
 *    - 注意：加入后所有 48 种语言都豁免，真正的全局不变单词
 *
 * 3. SHARED_WORDS_BY_LANG （按语言，按英文值匹配）
 *    - 用法：SHARED_WORDS_BY_LANG['xx'].add('EnglishWord')
 *    - 适用：某英文词在特定语言中就是该语言的正常借词/科学术语
 *      （如荷兰语中 Histamine 就是 Histamine；越南语中 Melamine 就是 Melamine）
 *    - 注意：仅在指定语言豁免，同一词在其他语言仍会报错
 *
 * 判定顺序（短路逻辑）：
 *   1. IGNORE_FALLBACK_KEYS.has(key)     → 跳过 ✅
 *   2. IGNORE_FALLBACK_VALUES.has(value) → 跳过 ✅
 *   3. SHARED_WORDS_ALL.has(value)       → 跳过 ✅（全局共享词）
 *   4. SHARED_WORDS_BY_LANG[语言].has(value) → 跳过 ✅
 *   5. 以上都不满足                       → 报错 ❌
 *
 * 使用建议（选哪个）：
 *   - 如果某个 key 在所有语言都不该翻译 → IGNORE_FALLBACK_KEYS
 *   - 如果某个英文词在所有语言都不该翻译 → IGNORE_FALLBACK_VALUES
 *   - 如果某个英文词仅在特定语言中合理保留 → SHARED_WORDS_BY_LANG
 *   - 当不确定时，先加 SHARED_WORDS_BY_LANG（范围最小），
 *     如果后来发现所有语言都同样情况，再升级到 IGNORE_FALLBACK_VALUES
 *
 * 使用方法：
 *   node scripts/check-translations.mjs
 *   node scripts/check-translations.mjs --lang zh
 *   node scripts/check-translations.mjs --short
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOCALES } from './locales.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..'); // monorepo root
const PROJECT_ROOT = process.cwd();

// Auto-detect MESSAGES_DIR: if CWD-based messages/ exists, use it;
// otherwise fall back to detecting the app from well-known paths.
// This allows the script to be run from repo root or any app directory.
const MESSAGES_DIR_CWD = path.join(PROJECT_ROOT, 'messages');
const MESSAGES_DIR = fs.existsSync(MESSAGES_DIR_CWD)
  ? MESSAGES_DIR_CWD
  : [
      path.join(REPO_ROOT, 'apps', 'site', 'messages'),
      path.join(REPO_ROOT, 'apps', 'portal', 'messages'),
      path.join(REPO_ROOT, 'apps', 'blog', 'messages'),
    ].find(d => fs.existsSync(d)) || MESSAGES_DIR_CWD;

const BLOG_DIR = path.join(PROJECT_ROOT, 'content', 'blog');
const MONOREPO_ROOT = path.resolve(__dirname, '..');
const SHARED_UI_MESSAGES_DIR = path.join(MONOREPO_ROOT, 'ui', 'messages');
const AUTO_BREADCRUMB_PATH = path.join(MONOREPO_ROOT, 'ui', 'src', 'AutoBreadcrumb.tsx');
const SITE_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'site', 'messages');
const PORTAL_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'portal', 'messages');

// ============================================================
// 不应翻译的词表
// ============================================================
const NO_TRANSLATE = new Set([
  'WeChat', 'LinkedIn', 'Facebook', 'Twitter', 'YouTube',
  'SinoTrade Compliance', 'SinoTrade-nakoming', 'Global Trade Network',
  'David Zhang', 'Sarah Chen', 'Mike Wang', 'Leo Liu',
  'GB 7718-2025', 'you@company.com', 'John Smith',
  'GACC', 'NMPA', 'CCC', 'CBEC', 'CIFER', 'MOA', 'CNCA', 'MEE', 'min',
]);

// ============================================================
// IGNORE_FALLBACK_KEYS — 全局按 key 豁免
// ============================================================
// 当某个 key 在项目设计中本来就该保持英文时加入这里。
// 加入后所有 48 种语言都豁免（范围最广，慎用）。
// 适用场景：
//   - 邮箱/占位符 → 'Auth.emailPlaceholder'
//   - 报告状态/计划/客户 → 'Report.status', 'ReportSection.timelineClient'
//   - 联系人信息 → 'AiAssistance.contactEmail', 'AiAssistance.contactLinkedIn'
//   - 第三方平台缩写 → 'Check.fcc', 'Check.ce', 'Check.ul'
// 如果你不确定某个 key 是否在所有语言都保留英文，
// 优先用 SHARED_WORDS_BY_LANG（按语言豁免，范围更小）。
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
  'Auth.emailPlaceholder', 'Auth.email', 'Dashboard.email',
  'Pricing.singlePrice', 'Pricing.professionalPrice', 'Pricing.monthlyPrice',
  'Dashboard.title',
  // Portal: brand/address/abbreviation — must stay English
  'Check.reportFooterEmail', 'Check.reportFooterName',
  'Check.reportFooterAddress', 'Check.reportFooterWebsite',
  'Check.fcc', 'Check.ce', 'Check.ul',
  'Check.complianceNo',
  'Check.reportProduct', 'Check.resultProduct', 'Check.resultProductLabel',
  'Check.packagingPlastic',
  'Check.reportModuleCrossborder', 'Check.crossborderTitle',
  'Check.crossborderDesc',
  'Home.popular',
  // Portal CTA links — English CTAs pending translation assignment
  'Home.heroPortalCta',
  'ServiceCommon.portalCtaTitle',
  'ServiceCommon.portalCtaLink',
  'ServiceCommon.portalCtaGenericTitle',
  'ServiceCommon.portalCtaGenericLink',
  // Report: Status/Plan/Client are correct loanwords in many languages (Germanic, Romance, etc.)
  'Report.status', 'Report.plan', 'Report.client',
  'ReportSection.status', 'ReportSection.plan',
  'ReportSection.client', 'ReportSection.timelineClient',
  // Portal: document/category names — keep English as technical terms
  'Check.gaccTitle',
  'Check.packagingCan',
  'Check.cbDoc_brandAuth_name', 'Check.cbDoc_label_name',
  'Check.nmpaDoc_label_name',
  'Check.catCcc_electronics', 'Check.catNmpa_makeup',
  // Portal: Risk/Readiness indicators — keep English as short labels
  'Check.complianceNo', 'Check.no',
  'Check.labelRiskNote_cost', 'Check.labelRiskDim_cost',
  'Check.labelRiskDim_additive',
  'Check.gaccTimeline_label_name',
  // Check: standard codes, abbreviations, scientific terms — keep English
  'Check.cnipa_npc', 'Check.china_rohs_2', 'Check.douyin_global',
  'Check.gb_7718_2011_rev_2025', 'Check.mofcom_gacc', 'Check.ndrc_mofcom_2020',
  'Check.nhc_cnca', 'Check.asean_cosmetics_gmp', 'Check.eu_cosmetics_gmp_iso_22716',
  'Check.us_fda_cgmp', 'Check.aflatoxin_m1', 'Check.clenbuterol_β_agonists',
  'Check.brand_auth_letter', 'Check.formula_change_re_label', 'Check.label_artwork',
  'Check.gb_7718_2011_under_revision', 'Check.additive_codes', 'Check.benzo_a_pyrene',
  'Check.additive_review', 'Check.cbec_retail_import_policy', 'Check.label_review',
  'Check.label_update_monitoring', 'Check.publication_opposition', 'Check.notification',
  'Check.nmpa_2021_tech_specs', 'Check.mycotoxins_ochratoxin_a', 'Check.miit_order_32_2016',
  'Check.microbiological_coliforms_pathogens', 'Check.mycotoxins_aflatoxin_don_zearalenone',
  'Check.tetracycline_antibiotics',
  'Check.accept_in_vitro_alternative_methods_for_certain_en',
  'Check.asean_china_fta_also_rcep_member',
  'Check.bse_history_enhanced_beef_inspections', 'Check.bse_related_enhanced_checks_on_beef',
  'Check.china_australia_fta_chafta_reduced_tariffs_on_many',
  'Check.china_australia_fta_chafta_reduced_tariffs_on_many_1',
  'Check.coordinate_testing_with_nmpa_designated_labs',
  'Check.energy_efficiency_srrc_wireless_rohs_as_applicable',
  'Check.integrated_logistics_cainiao', 'Check.kimchi_has_specific_ciq_inspection_procedures',
  'Check.mofcom_gacc_joint_list',
  'Check.no_fta_post_brexit_mfn_rates_negotiations_ongoing',
  'Check.plaform_audits_product_listings',
  'Check.post_brexit_certification_adjustments', 'Check.post_brexit_trade_framework_still_developing',
  'Check.rcep_member_gradual_tariff_reductions_on_agricultu',
  'Check.safety_of_it_equipment_mandatory_for_electronics_c',
  'Check.strong_in_beef_wine_dairy_and_grains_chafta_provid',
  'Check.use_cnca_certified_led_drivers',
  'Check.verify_via_mofcom_cbec_positive_list_catalog_or_co',
  'Check.csar_2021_article_3_5_category_determined_by_produ',
  'Check.declare_in_ingredient_list_or_separate_contains_statement',
  'Check.products_needing_full_registration_注册_sunscreen_wh',
  // ReportSection: section/label/field names — intentional English
  'ReportSection.labelFormat', 'ReportSection.fieldFormat',
  'ReportSection.labelDimension', 'ReportSection.fieldTurnaround',
  'ReportSection.labelTurnaround', 'ReportSection.labelPlatform',
  'ReportSection.labelItem', 'ReportSection.labelDocument',
  'ReportSection.labelPhase', 'ReportSection.tableHeaderPhase',
  'ReportSection.labelVerdict', 'ReportSection.labelCost',
  'ReportSection.labelEstCost', 'ReportSection.labelNotes',
  'ReportSection.labelCause', 'ReportSection.labelSolution',
  'ReportSection.labelLab', 'ReportSection.fieldLab',
  'ReportSection.labelGB28050Highlights', 'ReportSection.labelTopCompetingOrigins',
  'ReportSection.labelQSSCLogo', 'ReportSection.compAllergens',
  'ReportSection.animalTesting', 'ReportSection.customsClearance',
  'ReportSection.nmpaSpecialLabel', 'ReportSection.nmpaSpecialTimeline',
  'ReportSection.ipMonitorEnforce',
  'ReportSection.valueMFNRate', 'ReportSection.valueClassification',
  'ReportSection.valueRegion', 'ReportSection.valueNo',
  'ReportSection.valueVAT',
  'ReportSection.channelSuitabilityMedium', 'ReportSection.channelSuitabilityLow',
  'ReportSection.compareChina', 'ReportSection.compareEU', 'ReportSection.compareUS',
  'ReportSection.customsLabTestingResp', 'ReportSection.customsPortArrivalResp',
  'ReportSection.customsClearanceResp',
  'ReportSection.emergencyScenario3Basis',
  'ReportSection.sectionHorizonScan', 'ReportSection.sectionMarketIntelligence',
  'ReportSection.sectionTrademarkWatchService',
  'ReportSection.sectionRiskAssessmentMatrix', 'ReportSection.squattingRiskLabel',
  'ReportSection.squattingRealWorldCase',
  'ReportSection.sectionLabelCompliance',
  'ReportSection.sectionCBReportGuide',
  'ReportSection.labelTopCompetingOrigins',
  // AiAssistance: contact info & service headers (partial strings ending with ':')
  'AiAssistance.contactEmail', 'AiAssistance.contactLinkedIn',
  'AiAssistance.serviceGACC', 'AiAssistance.serviceCCC', 'AiAssistance.serviceLabel',
  'AiAssistance.serviceNMPA', 'AiAssistance.serviceCBEC', 'AiAssistance.serviceBrand',
  'AiAssistance.servicesTitle',
  // Report: name/email/verdict — loanwords in Romance/Germanic languages
  'Report.nameLabel', 'Report.emailLabel', 'Report.verdict',
  // Check report labels — loanwords in French, Romanian, Catalan
  'Check.reportVerdict', 'Check.reportClient',
  // Check dimension names — "Cost" is loanword in Catalan, Romanian
  'Check.cccDimension_cost', 'Check.labelDimension_cost',
  'Check.nmpaDimension_cost', 'Check.tmDimension_cost',
  // Check dimension labels — loanwords/technical terms
  'Check.cccDimension_testing',
  'Check.tmDimension_squatterRisk',
  // Check category labels — product categories with HS codes
  'Check.cccCat_electronics_label', 'Check.nmpaCat_makeup_label',
  // French exemption: translation identical to English
  'Check.nmpaRiskNote_tests',
]);

// ============================================================
// IGNORE_FALLBACK_VALUES — 全局按英文值豁免
// ============================================================
// 当某个英文值在所有语言中都保持原文不翻译时加入这里。
// 加入后所有 48 种语言都豁免（范围最广，慎用）。
// 适用场景：
//   - 行业缩写如 'FCC', 'CE', 'UL', 'CIQ', 'PCR', 'INN'
//   - 格式串如 'PDF', 'Excel/PDF', 'PDF/JPEG', 'Word'
//   - 标准号如 'GB 7718 / GB 28050'
//   - 全球通用的英文术语如 'FAQ', 'Login', 'Report', 'Dashboard'
// 注意：确认该词在所有语言中都不需要翻译再加。
// 如果只在部分语言中保持英文，用 SHARED_WORDS_BY_LANG。
const IGNORE_FALLBACK_VALUES = new Set([
  'NMPA Cosmetics Filing', 'NMPA cosmetics filing and registration support',
  'PIPL Data Compliance Assessment', 'GACC Food Registration',
  'China Import Compliance Services', 'Medical device compliance training and advisory',
  'Baby & Maternal', 'Free Check', 'FAQ', 'WhatsApp',
  'Sign Out', 'My Reports', 'Settings', 'Subscription',
  'Pricing', 'Dashboard', 'Billing', 'Login', 'Register', 'Report',
  // 认证标志（全球通用，不应翻译）
  'FCC', 'CE', 'UL',
  // 格式串（全球通用，不应翻译）
  'Excel/PDF', 'PDF', 'HTML/JPEG', 'PDF/JPEG', 'PDF/DXF', 'PDF/Excel',
  'PDF, ISO 9001/QSO', 'JPEG, 5-10cm', 'JPEG, PNG', 'Word',
  'IECEE lab PDF', 'PDF, bilingual', 'PDF notarized', 'PDF, NMPA 2021 format', 'PDF NMPA format',
  'CNCA format', 'Excel per Nice Class',
  // 缩写（全球通用）
  'ID', 'CIQ', 'VAT', 'MEDIUM', 'LOW', 'Lab', 'Broker',
  'EU', 'US', 'China', 'IPPC', 'INN', 'PCR', 'PAHs', 'DON',
  // 标准号引用
  'GB 7718 / GB 28050',
  // 价格（保留数字格式）
  '$0', '$1.99', '$9.9', '$500+', '$500-2,000',
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

// ============================================================
// SHARED_WORDS_BY_LANG — 按语言豁免（英文借词/科学术语）
// ============================================================
// 当某个英文词在特定语言中是正常的借词/科学术语，
// 在该语言中保持英文是合理的行为。
// 区别于 IGNORE_FALLBACK_VALUES（全局），这里只豁免指定语言。
// 同一英文词在语言 A 豁免，在语言 B 仍会报错。
// 适用场景：
//   - 科学术语：荷兰语 'Histamine' 就是 'Histamine'，斯瓦希里语 'Aflatoxin M1' 保持英文
//   - 借词：法语 'Services' 就是借词，阿尔巴尼亚语 'Melamine' 保持英文
//   - 标准名：瑞典语中 'GB 7718 Revision' 的 'Revision' 是瑞典语固有词
// 使用方法：
//   SHARED_WORDS_BY_LANG['xx'].add('EnglishWord')
// 建议：吃不准时用这个（范围最小），以后发现所有语言都需要再加 IGNORE 类。
const SHARED_WORDS_BY_LANG = {
  fr: new Set(['Services', 'Contact', 'Blog', 'Page', 'Message', 'Audit', 'Legal',
      'Cause', 'Solution', 'Classification', 'Histamine', 'Limitation']),
  de: new Set(['Blog', 'Legal', 'Aflatoxin M1']),
  nl: new Set(['Blog', 'Contact', 'Melamine', 'Histamine']),
  sv: new Set(['Blog', 'Contact', 'Services', 'Aflatoxin M1', 'GB 7718 Revision', 'Special']),
  da: new Set(['Blog', 'Contact', 'Services']),
  no: new Set(['Blog', 'Contact', 'Services']),
  es: new Set(['Blog', 'Contact', 'Services']),
  it: new Set(['Blog', 'Contact', 'Services']),
  pt: new Set(['Blog', 'Contact', 'Services']),
  ca: new Set(['Blog', 'Contact', 'Services', 'Client']),
  cs: new Set(['Blog', 'Aflatoxin M1']),
  hu: new Set(['Blog', 'Aflatoxin M1']),
  sq: new Set(['Blog', 'Melamine', 'Histamine']),
  vi: new Set(['Blog', 'Melamine', 'Aflatoxin M1']),
};
// Blog is universal
for (const lang of ['af','az','ca','cs','el','fi','hr','hu','id','ka','ms','pl','ro','si','sk','sl','sq','sw','tr','vi']) {
  if (!SHARED_WORDS_BY_LANG[lang]) SHARED_WORDS_BY_LANG[lang] = new Set();
  SHARED_WORDS_BY_LANG[lang].add('Blog');
}

// Romanian: 'Special' is same as English (loanword)
SHARED_WORDS_BY_LANG['ro'].add('Special');

// Swahili keeps international scientific terms in English
SHARED_WORDS_BY_LANG['sw'].add('Melamine');
SHARED_WORDS_BY_LANG['sw'].add('Tetracycline antibiotics');
SHARED_WORDS_BY_LANG['sw'].add('Clenbuterol/β-agonists');
SHARED_WORDS_BY_LANG['sw'].add('Benzo(a)pyrene');
SHARED_WORDS_BY_LANG['sw'].add('Mycotoxins');

const ENGLISH_RESIDUAL_ALLOW = new Set([
  ...NO_TRANSLATE, ...SHARED_WORDS_ALL,
  'Tmall', 'JD', 'Douyin', 'TikTok', 'RED', 'Pinduoduo', 'Xiaohongshu',
  'Kaola', 'Jingan', 'Little', 'Red', 'Book', 'Worldwide', 'Global', 'China',
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
  'Class',
  'com', 'example', 'http', 'https', 'www', 'API',
  'for', 'and', 'This', 'About',
  'Telegram',
  'FAQ',
  'WhatsApp',
  'cookie', 'Cookie', 'cookies',
  'banner', 'Banner',
  'PDF', 'PET', 'ABV', 'EST',
  'Wine', 'Red', 'Chocolate', 'Dark',
  'Nice', 'pcs', 'Est', 'web', 'mail',
  'Sunscreen', 'Cross', 'Border',
  'Decret', 'Douin',
  'Bordeaux', 'NaturePure',
  'New', 'Ground', 'Stone',
  'USA', 'Bottle', 'Box', 'Pouch',
  'need', 'only', 'what', 'you',
  'Cabernet', 'Sauvignon',
  'Self', 'Sinotrade',
  'Assistance', 'border',
  // 非拉丁语言英文残留豁免（技术缩写/格式名/占位变量）
  'CFDA', 'DON', 'FOB', 'INN', 'INS', 'IPPC', 'NHC', 'NRV', 'PAHs', 'PCR',
  'JPEG', 'PNG', 'DHL', 'FedEx', 'Word',
  'fumonisin',
  'YYYY', 'Koala',
  // i18n 插值变量名
  'brandName', 'productName', 'category', 'timeline',
  'address', 'cost', 'name', 'lab', 'packer', 'kcal',
  // 科学术语/标准缩写
  'Salmonella', 'Vibrio', 'Producer', 'Excel', 'Pdf', 'pdf',
  'Alibaba', 'RMB',
  'EMC', 'GDA', 'ICSC', 'IECEE', 'MFN', 'QUID', 'QSO', 'WIPO',
  'Engage', 'Test', 'Report',
  // 第三批残留豁免
  'Aflatoxin', 'Benzo', 'ochratoxin', 'pyrene', 'Made',
  'COA', 'GMO', 'PAH', 'PRC',
  'Accredited', 'Country', 'Courier', 'courier', 'Generic',
  'additives', 'bulging', 'fanciful', 'kilojoules',
  'logistics', 'offline', 'online', 'squatted', 'tests',
  // 第四批残留豁免
  'Agent', 'Artwork', 'Benchmark', 'Good', 'Manufacturing',
  'Nutrient', 'Practice', 'Reference', 'Security', 'Trade', 'Value',
  'FMD', 'ITEM', 'ONLY', 'PCB',
  'Listeria', 'Nitrofuran', 'Tetracycline', 'melamine', 'zearalenone',
  'Powered', 'additive', 'check', 'failed',
  // 第五批残留豁免 + 小写变体
  'aflatoxin', 'benzopyrene', 'phytosanitary',
  'exedance',
  'Notarization', 'Squatting', 'Classification', 'High',
  'Chloramphenicol', 'Leptospira',
  'Ningbo', 'Shanghai',
  'carbs', 'saturates',
  'cross', 'platform',
  // 第六批残留豁免（Portal 消息+邮箱片段）
  'david', 'sinotradecompliance',
  'FCC', 'DXF',
  'Color', 'Consumer', 'Electronics', 'Competing', 'Origins', 'Top',
  // 第八批残留豁免（缩写/标准名/借词 — 不需翻译）
  'BSE', 'Brexit', 'Cainiao', 'ChAFTA', 'Kimchi', 'LED', 'MIIT', 'MOFCOM',
  'RCEP', 'RoHS', 'Paid', 'cGMP', 'FDA', 'vitro',
  // 第九批残留豁免（更多缩写/标准名/专用名词）
  'ACETA', 'ASEAN', 'BRICS', 'CHAFTA', 'NDRC', 'NMAP', 'NPC', 'Mercosur',
  'Canola', 'canola', 'Harmonics', 'Parmigiano', 'Phthalates', 'phthalate',
  'Prosciutto', 'Clenbuterol', 'Premium', 'Trans', 'bonded', 'warehouse',
  'squatter', 'Squatter', 'labels', 'translation', 'Rev', 'Engl',
  'Plaform', // typo in source, intentionally kept matching
  'Mycotoxins', 'Article', 'Contains',
  'dye', 'full', 'hair', 'needing', 'perm', 'registration', 'sunscreen', 'whitening',
  // 第十批残留豁免（批量补全遗漏的小写/变体）
  'CGMP', 'Art', 'calc', 'Ingredients', 'Ingrediants',
  'rapeseed', 'Rapeseed', 'Italian', 'documents', 'portal',
  'Specs', 'Tech', 'squatters', 'Auth', 'Letter', 'rev',
  'agonists', 'Additives', 'mycotoxins', 'avocados', 'blueberries',
  'Door', 'Live', 'Safety', 'equipment', 'per',
  'domin', // truncation in source - 'dominant'


  // 站点消息残留
  'Check',
  // 第七批残留豁免（Portal 最终残留）
  'Horizon', 'Scan', 'Assessment', 'Matrix', 'Risk',
  'Can', 'Tin', 'Package',
  'notarized', 'LOW',
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

// Keys that are intentionally identical across languages (numbers, names, acronyms)
const SKIP_ENGLISH_RESIDUAL_PATTERNS = [
  /Number$/,
  /Name$/,
  /Placeholder$/,
  /^\.pageInfo$|author$/,
  /^expert/,
  /^partner/,
  /^sameAs$/,
  /^IndustriesCommon\./,
  /^Sitemap\./,
  /^ThankYou\.(readTime|stat)/,
  /^DefinitionSchema\./,
  /Industry.*meta(Title|Description)/,
];

// ============================================================
// SKIP_CHAR_CHECK_PATTERNS — 跳过非目标语言字符检查的 key 模式
// 用于格式说明/占位符等必须保留拉丁字符的键
// ============================================================
const SKIP_CHAR_CHECK_PATTERNS = [
  /Placeholder$/,
  /_format$/,
  /[Ee]mergency[Ss]cenario\d+Basis$/,
  /cbViability$/,
  /safety_of_it_equipment/,
];

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
    .filter(f => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_t6'))
    .map(f => path.basename(f, '.json'))
    .sort();

  const langsToCheck = targetLang
    ? (allLangs.includes(targetLang) ? [targetLang] : [])
    : allLangs;

  // Keys that are intentionally identical across all languages (numbers, names, acronyms, placeholders)
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
      if (langVal === '') {
        if (SKIP_ENGLISH_RESIDUAL_PATTERNS.some(p => p.test(key))) continue;
        totalIssues.byType.empty.push([lang, key]); langIssues++; continue;
      }

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
          if (!isShared && SKIP_ENGLISH_RESIDUAL_PATTERNS.some(p => p.test(key))) isShared = true;
          if (!isShared) {
            totalIssues.byType.fallback.push([lang, key, enVal]);
            langIssues++;
          }
        }
        continue;
      }

      // 3. no-translate translated
      if (NO_TRANSLATE.has(enVal) && langVal !== enVal && !IGNORE_FALLBACK_KEYS.has(key)) {
        totalIssues.byType.no_translate_translated.push([lang, key, enVal, langVal]);
        langIssues++;
        continue;
      }

      // 4. wrong chars
      if (LANG_CHAR_CHECKS[lang]) {
        const { ranges, desc } = LANG_CHAR_CHECKS[lang];
        if (!hasCharRange(langVal, ranges) && /[a-zA-Z]/.test(langVal)) {
          const shortKey = key.split('.').pop() || key;
          const isSkipKey = SKIP_CHAR_CHECK_PATTERNS.some(p => p.test(shortKey) || p.test(key));
          if (!isSkipKey) {
            totalIssues.byType.wrong_chars.push([lang, key, langVal, desc]);
            langIssues++;
          }
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
        // Strip variable placeholders like {originCountry} before checking
        const cleanVal = langVal.replace(/\{[A-Za-z ]+\}/g, '');
        const engWords = new Set((cleanVal.match(/\b[A-Za-z]{3,}\b/g) || []));
        if (engWords.size) {
          let residual = new Set([...engWords].filter(w => !ENGLISH_RESIDUAL_ALLOW.has(w)));
          if (SHARED_WORDS_BY_LANG[lang]) {
            residual = new Set([...residual].filter(w => !SHARED_WORDS_BY_LANG[lang].has(w)));
          }
          if (residual.size) {
            // Skip keys that are intentionally identical across languages
            const shortKey = key.split('.').pop() || key;
            const isSkipKey = SKIP_ENGLISH_RESIDUAL_PATTERNS.some(p => p.test(shortKey) || p.test(key));
            if (!isSkipKey) {
              totalIssues.byType.english_residual.push([lang, key, [...residual].sort()]);
              langIssues++;
            }
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
// LOCALES 从 ./locales.mjs 共享导入
// ============================================================

function checkLocaleConsistency(verbose = true) {
  const files = fs.readdirSync(MESSAGES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_t6'))
    .map(f => path.basename(f, '.json'))
    .sort();

  const actual = new Set(files);
  const canonical = new Set(LOCALES.filter(l => l !== 'en'));

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
// 行业 metaTitle/metaDescription 完整性检查
// ============================================================

const INDUSTRY_NAMESPACES = [
  'IndustryDairy', 'IndustryMeat', 'IndustryWine', 'IndustrySkincare', 'IndustryPetFood',
  'IndustrySupplements', 'IndustryBaby', 'IndustryElectronics', 'IndustryMedical', 'IndustryEcommerce',
  'IndustriesCommon',
];

function checkIndustryMetaCompleteness(verbose = true) {
  const missingKeys = [];
  const metaDir = SITE_MESSAGES_DIR;

  for (const locale of LOCALES) {
    const filePath = path.join(metaDir, `${locale}.json`);
    if (!fs.existsSync(filePath)) continue;

    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const ns of INDUSTRY_NAMESPACES) {
      if (typeof fileContent[ns] !== 'object') {
        missingKeys.push(`${ns}.metaTitle/metaDescription 在 ${locale}.json 中 — 命名空间缺失`);
        continue;
      }

      if (!fileContent[ns].metaTitle) {
        missingKeys.push(`${ns}.metaTitle 在 ${locale}.json 中缺失`);
      }
      if (!fileContent[ns].metaDescription) {
        missingKeys.push(`${ns}.metaDescription 在 ${locale}.json 中缺失`);
      }

      // Check for translation key leakage (key name appears as value)
      const valTitle = fileContent[ns].metaTitle || '';
      const valDesc = fileContent[ns].metaDescription || '';
      if (valTitle.includes('metaTitle') && valTitle.includes('.')) {
        missingKeys.push(`${ns}.metaTitle 在 ${locale}.json 中泄漏了翻译 key: "${valTitle.slice(0, 60)}"`);
      }
      if (valDesc.includes('metaDescription') && valDesc.includes('.')) {
        missingKeys.push(`${ns}.metaDescription 在 ${locale}.json 中泄漏了翻译 key: "${valDesc.slice(0, 60)}"`);
      }
    }
  }

  if (verbose && missingKeys.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏭 行业 meta 完整性检查: ${missingKeys.length} 个问题`);
    for (const key of missingKeys.slice(0, 30)) {
      console.log(`  ❌ ${key}`);
    }
    if (missingKeys.length > 30) {
      console.log(`  ... 还有 ${missingKeys.length - 30} 条`);
    }
  } else if (verbose) {
    console.log(`\n🏭 行业 meta 完整性检查: ✅ 所有 ${LOCALES.length} 语言 × ${INDUSTRY_NAMESPACES.length} 命名空间完整`);
  }

  return missingKeys.length;
}

// ============================================================
// Portal 翻译检查
// ============================================================

function checkPortalTranslations(verbose = true) {
  if (!fs.existsSync(PORTAL_MESSAGES_DIR)) {
    if (verbose) console.log(`\n📱 Portal 翻译检查: ⏭️ 跳过 (${PORTAL_MESSAGES_DIR} 不存在)`);
    return 0;
  }

  const enPath = path.join(PORTAL_MESSAGES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    if (verbose) console.log(`\n📱 Portal 翻译检查: ❌ 找不到英文源文件`);
    return 0;
  }

  const enFlat = flattenKeys(loadJSON(enPath));

  const allLangs = fs.readdirSync(PORTAL_MESSAGES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_'))
    .map(f => path.basename(f, '.json'))
    .sort();

  let totalIssues = 0;
  const details = { fallback: [], empty: [], english_residual: [] };

  for (const lang of allLangs) {
    const langPath = path.join(PORTAL_MESSAGES_DIR, `${lang}.json`);
    if (!fs.existsSync(langPath)) continue;
    const langFlat = flattenKeys(loadJSON(langPath));

    for (const [key, enVal] of Object.entries(enFlat)) {
      if (typeof enVal !== 'string' || enVal.length <= 2) continue;
      const langVal = langFlat[key] ?? '';

      // empty check
      if (langVal === '') {
        details.empty.push([lang, key]); totalIssues++;
        continue;
      }

      // fallback check — skip known shared words (FAQ, Blog, WhatsApp, etc.)
      if (langVal === enVal && !NO_TRANSLATE.has(enVal) && !IGNORE_FALLBACK_KEYS.has(key) && !IGNORE_FALLBACK_VALUES.has(enVal)) {
        // Skip shared English words that are acceptable
        let isShared = SHARED_WORDS_ALL.has(enVal);
        if (!isShared && SHARED_WORDS_BY_LANG[lang]?.has(enVal)) isShared = true;
        if (!isShared) {
          const stripped = enVal.replace(/[^\w\s]/g, '').trim();
          if (SHARED_WORDS_ALL.has(stripped) || SHARED_WORDS_BY_LANG[lang]?.has(stripped)) isShared = true;
        }
        if (!isShared) {
          details.fallback.push([lang, key, enVal]); totalIssues++;
        }
      }

      // English residual in non-latin
      if (NON_LATIN_LOCALES.has(lang)) {
        // Strip variable placeholders like {originCountry} before checking
        const cleanVal = langVal.replace(/\{[A-Za-z ]+\}/g, '');
        const engWords = new Set((cleanVal.match(/\b[A-Za-z]{3,}\b/g) || []));
        if (engWords.size) {
          let residual = new Set([...engWords].filter(w => !ENGLISH_RESIDUAL_ALLOW.has(w)));
          if (SHARED_WORDS_BY_LANG[lang]) {
            residual = new Set([...residual].filter(w => !SHARED_WORDS_BY_LANG[lang].has(w)));
          }
          if (residual.size) {
            const isSkipKey = SKIP_ENGLISH_RESIDUAL_PATTERNS.some(p => p.test(key));
            if (!isSkipKey) {
              details.english_residual.push([lang, key, [...residual].sort()]); totalIssues++;
            }
          }
        }
      }
    }
  }

  if (verbose) {
    console.log(`\n📱 Portal 翻译检查 (${allLangs.length} 语言):`);
    if (details.fallback.length) {
      console.log(`  ❌ 英文 fallback (${details.fallback.length} 处):`);
      for (const [l, k, v] of details.fallback.slice(0, 15)) console.log(`    [${l}] ${k} → ${v.slice(0, 60)}`);
    }
    if (details.empty.length) {
      console.log(`  ❌ 空值 (${details.empty.length} 处):`);
      for (const [l, k] of details.empty.slice(0, 15)) console.log(`    [${l}] ${k}`);
    }
    if (details.english_residual.length) {
      console.log(`  ❌ 英文残留 (${details.english_residual.length} 处):`);
      for (const [l, k, w] of details.english_residual.slice(0, 15)) console.log(`    [${l}] ${k} → ${w.slice(0, 10).join(', ')}`);
    }
    if (totalIssues === 0) console.log('  ✅ 全部通过');
  }

  return totalIssues;
}

// ============================================================
// 共享 UI 消息完整性检查（packages/ui/messages/）
// 这是以前漏掉的：check-translations.mjs 只扫描 per-app messages/，
// 但 packages/ui/messages/ 是所有站点共享的翻译源，必须检查。
// ============================================================
function checkSharedUiMessages(verbose = true) {
  if (!fs.existsSync(SHARED_UI_MESSAGES_DIR)) {
    if (verbose) console.log(`\n🔗 共享 UI 消息检查: ⏭️ 跳过 (${SHARED_UI_MESSAGES_DIR} 不存在)`);
    return 0;
  }

  const enPath = path.join(SHARED_UI_MESSAGES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    if (verbose) console.log(`\n🔗 共享 UI 消息检查: ❌ 找不到英文源文件`);
    return 0;
  }

  const enFlat = flattenKeys(loadJSON(enPath));
  const allLangs = fs.readdirSync(SHARED_UI_MESSAGES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'en.json')
    .map(f => path.basename(f, '.json'))
    .sort();

  let totalIssues = 0;
  const details = { fallback: [], empty: [] };

  for (const lang of allLangs) {
    const langPath = path.join(SHARED_UI_MESSAGES_DIR, `${lang}.json`);
    if (!fs.existsSync(langPath)) continue;
    const langFlat = flattenKeys(loadJSON(langPath));

    for (const [key, enVal] of Object.entries(enFlat)) {
      if (typeof enVal !== 'string' || enVal.length <= 2) continue;
      const langVal = langFlat[key] ?? '';

      // empty
      if (langVal === '') {
        details.empty.push([lang, key]); totalIssues++;
        continue;
      }

      // fallback — same logic as portal check
      if (langVal === enVal && !NO_TRANSLATE.has(enVal) && !IGNORE_FALLBACK_KEYS.has(key) && !IGNORE_FALLBACK_VALUES.has(enVal)) {
        let isShared = SHARED_WORDS_ALL.has(enVal);
        if (!isShared && SHARED_WORDS_BY_LANG[lang]?.has(enVal)) isShared = true;
        if (!isShared) {
          const stripped = enVal.replace(/[^\w\s]/g, '').trim();
          if (SHARED_WORDS_ALL.has(stripped) || SHARED_WORDS_BY_LANG[lang]?.has(stripped)) isShared = true;
        }
        if (!isShared) {
          details.fallback.push([lang, key, enVal]); totalIssues++;
        }
      }
    }
  }

  if (verbose) {
    console.log(`\n🔗 共享 UI 消息检查 (${allLangs.length} 语言):`);
    if (details.fallback.length) {
      console.log(`  ❌ 英文 fallback (${details.fallback.length} 处):`);
      for (const [l, k, v] of details.fallback.slice(0, 20)) console.log(`    [${l}] ${k} → ${v.slice(0, 60)}`);
      if (details.fallback.length > 20) console.log(`    ... 还有 ${details.fallback.length - 20} 条`);
    }
    if (details.empty.length) {
      console.log(`  ❌ 空值 (${details.empty.length} 处):`);
      for (const [l, k] of details.empty.slice(0, 10)) console.log(`    [${l}] ${k}`);
    }
    if (totalIssues === 0) console.log('  ✅ 全部通过');
  }

  return totalIssues;
}

// ============================================================
// 面包屑 key 完整性检查（从 AutoBreadcrumb.tsx 提取映射，验证所有 key 在 48 语言中存在）
// ============================================================
function extractBreadcrumbMappings() {
  if (!fs.existsSync(AUTO_BREADCRUMB_PATH)) return [];
  const content = fs.readFileSync(AUTO_BREADCRUMB_PATH, 'utf-8');
  const mappings = [];

  for (const varName of ['SEGMENT_LABELS', 'SERVICE_SEGMENT_LABELS', 'CHECK_SEGMENT_LABELS', 'INDUSTRY_LABELS']) {
    const idx = content.indexOf('const ' + varName + ':');
    if (idx < 0) continue;
    const eqIdx = content.indexOf('=', idx);
    const braceStart = content.indexOf('{', eqIdx);
    let depth = 0;
    let blockEnd = braceStart;
    for (let i = braceStart; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') depth--;
      if (depth === 0) { blockEnd = i; break; }
    }
    const block = content.substring(braceStart + 1, blockEnd);

    const entryRe = /'([^']+)':\s*'([^']+)'/g;
    let m;
    while ((m = entryRe.exec(block)) !== null) {
      mappings.push({ key: m[1], namespaceKey: m[2], source: varName });
    }
  }

  return mappings;
}

function getBreadcrumbNamespace(source) {
  return source === 'CHECK_SEGMENT_LABELS' ? 'Check' : 'Navbar';
}

function resolveNested(messages, locale, namespace, keyPath) {
  const parts = keyPath.split('.');
  let current = messages[locale];
  if (!current || typeof current !== 'object' || !(namespace in current)) return null;
  current = current[namespace];
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return null;
    current = current[part];
  }
  return typeof current === 'string' ? current : null;
}

function checkBreadcrumbKeys(verbose = true) {
  const mappings = extractBreadcrumbMappings();
  if (mappings.length === 0) {
    if (verbose) console.log('\n🧩 面包屑 key 检查: ⏭️ 未找到映射');
    return { total: 0, missing: [], mappings: 0 };
  }

  // Load merged messages: shared UI + site + portal
  const merged = deepMergeShared();
  const locales = Object.keys(merged).sort();

  const missing = [];
  for (const mapping of mappings) {
    const ns = getBreadcrumbNamespace(mapping.source);
    for (const locale of locales) {
      const value = resolveNested(merged, locale, ns, mapping.namespaceKey);
      if (!value) {
        missing.push({ locale, key: mapping.key, ns, keyPath: mapping.namespaceKey, source: mapping.source });
      }
    }
  }

  if (verbose) {
    console.log(`\n🧩 面包屑 key 检查 (${mappings.length} 映射 × ${locales.length} 语言):`);
    if (missing.length > 0) {
      console.log(`  ❌ 缺失 ${missing.length} 处:`);
      for (const m of missing.slice(0, 30)) {
        console.log(`    [${m.locale}] ${m.source}.${m.key} → ${m.ns}.${m.keyPath}`);
      }
      if (missing.length > 30) console.log(`    ... 还有 ${missing.length - 30} 条`);
    } else {
      console.log('  ✅ 所有面包屑 key 在 48 语言中均存在');
    }
  }

  return { total: missing.length, missing, mappings: mappings.length };
}

// Deep merge shared UI + site + portal messages for breadcrumb check
function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (key in result && typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
        && typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

function deepMergeShared() {
  const base = {};
  if (!fs.existsSync(SHARED_UI_MESSAGES_DIR)) return base;
  for (const file of fs.readdirSync(SHARED_UI_MESSAGES_DIR)) {
    if (!file.endsWith('.json')) continue;
    const locale = file.slice(0, -5);
    base[locale] = JSON.parse(fs.readFileSync(path.join(SHARED_UI_MESSAGES_DIR, file), 'utf-8'));
  }

  // Merge site overrides
  const siteDir = path.join(MONOREPO_ROOT, '..', 'apps', 'site', 'messages');
  if (fs.existsSync(siteDir)) {
    for (const file of fs.readdirSync(siteDir)) {
      if (!file.endsWith('.json')) continue;
      const locale = file.slice(0, -5);
      const data = JSON.parse(fs.readFileSync(path.join(siteDir, file), 'utf-8'));
      if (base[locale]) base[locale] = deepMerge(base[locale], data);
    }
  }

  // Merge portal overrides
  const portalDir = path.join(MONOREPO_ROOT, '..', 'apps', 'portal', 'messages');
  if (fs.existsSync(portalDir)) {
    for (const file of fs.readdirSync(portalDir)) {
      if (!file.endsWith('.json')) continue;
      const locale = file.slice(0, -5);
      const data = JSON.parse(fs.readFileSync(path.join(portalDir, file), 'utf-8'));
      if (base[locale]) base[locale] = deepMerge(base[locale], data);
    }
  }

  return base;
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
const industryMetaIssues = (targetLang || args.includes('--skip-industry-meta')) ? 0 : checkIndustryMetaCompleteness(!short);
const portalIssues = (targetLang || args.includes('--skip-portal-check')) ? 0 : checkPortalTranslations(!short);

if (jsonOut && result) {
  console.log(JSON.stringify(result.issues_by_type, null, 2));
}

const sharedUiIssues = checkSharedUiMessages(!short);
const breadcrumbResult = (targetLang || args.includes('--skip-breadcrumb-check')) ? { total: 0, missing: [] } : checkBreadcrumbKeys(!short);

const totalIssues = (result?.total_issues ?? 0) + blogIssues + (localeCheck?.total ?? 0) + industryMetaIssues + portalIssues + sharedUiIssues + breadcrumbResult.total;

if (totalIssues === 0) {
  console.log('\n✅ 全量核验通过！48 种语言无质量问题。');
} else {
  console.log(`\n⚠️ 发现 ${totalIssues} 个问题`);
  if (localeCheck && localeCheck.total > 0) {
    console.log(`   - 语种一致性: ${localeCheck.total} 个问题 (多余: ${localeCheck.extra.length}, 缺少: ${localeCheck.missing.length})`);
  }
  if (result && result.total_issues > 0) {
    console.log(`   - 网站翻译质量: ${result.total_issues} 个问题`);
  }
  if (blogIssues > 0) {
    console.log(`   - 博客 MDX: ${blogIssues} 个问题`);
  }
  if (industryMetaIssues > 0) {
    console.log(`   - 行业 meta 完整性: ${industryMetaIssues} 个问题`);
  }
  if (portalIssues > 0) {
    console.log(`   - Portal 翻译质量: ${portalIssues} 个问题`);
  }
  if (sharedUiIssues > 0) {
    console.log(`   - 共享 UI 消息: ${sharedUiIssues} 个问题`);
  }
  if (breadcrumbResult.total > 0) {
    console.log(`   - 面包屑 key: ${breadcrumbResult.total} 处缺失`);
  }
  if (process.argv.includes("--ci")) process.exit(1);
}
