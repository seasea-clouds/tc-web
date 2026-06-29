#!/usr/bin/env node
/**
 * check-i18n-keys.mjs — 通用 i18n key 完整性检查
 *
 * 检查三个站点（site / portal / ui）的所有 i18n key 是否在 48 语言文件中完整存在。
 * 同时检测硬编码英文 fallback 值。
 *
 * 用法：
 *   node check-i18n-keys.mjs                  # 报告模式
 *   node check-i18n-keys.mjs --ci             # CI 阻塞模式
 *   node check-i18n-keys.mjs --report         # 仅输出 JSON 报告
 *   node check-i18n-keys.mjs --missing-only   # 仅输出缺失 key 列表（用于翻译）
 *   node check-i18n-keys.mjs --generate-input # 生成 translate-tool 输入文件
 *
 * 作为独立脚本也可由 ci-check.mjs 调用。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(__dirname, '..');
const SITE_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'site', 'messages');
const PORTAL_MESSAGES_DIR = path.join(MONOREPO_ROOT, '..', 'apps', 'portal', 'messages');
const UI_MESSAGES_DIR = path.join(MONOREPO_ROOT, 'ui', 'messages');

// 48 种语言（en 为源语言，不参与检查）
const LOCALES = [
  'af','ar','az','be','bg','bn','ca','cs','da','de','el','es','fa','fi','fr',
  'he','hi','hr','hu','hy','id','it','ja','ka','ko','ms','ne','nl','no','pl',
  'pt','ro','ru','si','sk','sl','sq','sr','sv','sw','ta','th','tr','uk','ur','vi','zh'
];

// ============================================================
// 工具函数
// ============================================================
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
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
// 加载各站点消息
// ============================================================
function loadProjectMessages(projectName) {
  const dir = projectName === 'site' ? SITE_MESSAGES_DIR
    : projectName === 'portal' ? PORTAL_MESSAGES_DIR
    : UI_MESSAGES_DIR;
  if (!fs.existsSync(dir)) return { en: {}, locales: [] };
  const enRaw = loadJSON(path.join(dir, 'en.json'));
  if (!enRaw) return { en: {}, locales: [] };
  const en = flattenKeys(enRaw);

  const locales = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    if (projectName === 'portal' && file.startsWith('_')) continue;
    const locale = file.slice(0, -5);
    if (locale === 'en') continue;
    locales.push(locale);
  }

  return { en, locales: locales.sort() };
}

// ============================================================
// 检查 key 完整性
// ============================================================
function checkKeyCompleteness(projectName, projectData) {
  const { en, locales } = projectData;
  const missing = [];
  const extra = [];

  for (const lang of locales) {
    const langPath = path.join(
      projectName === 'site' ? SITE_MESSAGES_DIR :
      projectName === 'portal' ? PORTAL_MESSAGES_DIR :
      UI_MESSAGES_DIR,
      `${lang}.json`
    );
    const langFlat = loadJSON(langPath);
    if (!langFlat) {
      for (const key of Object.keys(en)) {
        missing.push({ locale: lang, key });
      }
      continue;
    }
    const langFlattened = flattenKeys(langFlat);

    for (const key of Object.keys(en)) {
      if (!(key in langFlattened)) {
        missing.push({ locale: lang, key });
      }
    }

    for (const key of Object.keys(langFlattened)) {
      if (!(key in en)) {
        extra.push({ locale: lang, key, value: langFlattened[key] });
      }
    }
  }

  return { missing, extra };
}

// ============================================================
// 检测硬编码英文 fallback
// ============================================================
const IGNORE_FALLBACK_VALUES = new Set([
  'NMPA Cosmetics Filing', 'NMPA cosmetics filing and registration support',
  'PIPL Data Compliance Assessment', 'GACC Food Registration',
  'China Import Compliance Services', 'Medical device compliance training and advisory',
  'Baby & Maternal', 'Free Check', 'FAQ', 'WhatsApp',
  'Sign Out', 'My Reports', 'Settings', 'Subscription',
  'Pricing', 'Dashboard', 'Billing', 'Login', 'Register', 'Report',
  'Home', 'About', 'Services', 'Packages', 'Blog', 'Contact',
  'WhatsApp', 'Search', 'Industries', 'Sign In', 'Sign Up',
  'Get a Quote', 'Free Check', 'Insights', 'Contact Us',
  // Shared UI: brand name and email placeholder — always English
  'SinoTrade Compliance', 'you@company.com',
  // Certification marks — always English
  'FCC',
  // Special = valid in Romanian & Swedish (not English fallback)
  'Special',
]);

// 原则：不要轻易加入 IGNORE_FALLBACK_KEYS，可以在脚本里精确排除，
// 除非是48语言都忽略，否则不要加入 IGNORE_FALLBACK_KEYS。
// 需要翻译的 key 在脚本中精确排除，不应翻译的值加入 IGNORE_FALLBACK_VALUES。
const IGNORE_FALLBACK_KEYS = new Set([
  // Report: Status/Plan/Client are correct loanwords in many languages (Germanic, Romance, etc.)
  'Report.status', 'Report.plan', 'Report.client',
  'Report.nameLabel', 'Report.verdict', 'Report.emailLabel',
  'ReportSection.status', 'ReportSection.plan',
  // AiAssistance: contact info & service headers (partial strings ending with ':')
  'AiAssistance.contactEmail', 'AiAssistance.contactLinkedIn',
  'AiAssistance.serviceGACC', 'AiAssistance.serviceCCC', 'AiAssistance.serviceLabel',
  'AiAssistance.serviceNMPA', 'AiAssistance.serviceCBEC', 'AiAssistance.serviceBrand',
  'AiAssistance.servicesTitle',
  // Navbar: short words that are correct loanwords in Germanic/Romance languages
  'Navbar.home', 'Navbar.about', 'Navbar.contact', 'Navbar.blog',
  // Sitemap: Home is correct loanword in Germanic/Romance
  'Sitemap.home', 'Sitemap.about', 'Sitemap.contact',
  // Auth: email placeholder is always English
  'Auth.emailPlaceholder',
  // DefinitionSchema: standard numbers/names are never translated
  'DefinitionSchema.gb7718Name', 'DefinitionSchema.cbecName', 'DefinitionSchema.ciferName',
  'DefinitionSchema.gaccName', 'DefinitionSchema.nmpaName', 'DefinitionSchema.csarName',
  'DefinitionSchema.cccName', 'DefinitionSchema.samrName',
  // Check glossary HS Code labels end with colon — always English
  'Check.gaccGlossary_hsCode', 'Check.labelGlossary_hsCode', 'Check.nmpaGlossary_hsCode',
  'Check.cbGlossary_hsCode', 'Check.tmGlossary_hsCode',
  // Check: file format values are always English (PDF, Excel, etc.)
  'Check.nmpaDoc_formula_format', 'Check.nmpaDoc_safety_format', 'Check.nmpaDoc_efficacy_format',
  'Check.nmpaDoc_label_name', 'Check.cccDoc_qualityManual_format', 'Check.cccDoc_components_format',
  'Check.cccDoc_circuit_format', 'Check.cccDoc_appForm_format', 'Check.cccDoc_specs_format',
  'Check.cbDoc_businessReg_format', 'Check.cbDoc_brandAuth_format', 'Check.cbDoc_listings_format',
  'Check.cbDoc_label_format', 'Check.cbDoc_ingredients_format', 'Check.cbDoc_label_name',
  'Check.cbDoc_brandAuth_name', 'Check.cbDoc_ingredients_format',
  'Check.tmDoc_poa_format', 'Check.tmDoc_logo_format', 'Check.tmDoc_goodsList_format',
  'Check.labelDoc_ingredients_format',
  // Check: lab test names are domain-specific scientific terms
  'Check.gaccCat_beverage_labTest_0', 'Check.gaccCat_coffee_tea_labTest_4',
  'Check.gaccCat_dairy_labTest_0', 'Check.gaccCat_dairy_labTest_3',
  'Check.gaccCat_grain_labTest_1', 'Check.gaccCat_honey_labTest_2',
  'Check.gaccCat_meat_labTest_0', 'Check.gaccCat_oil_labTest_0',
  'Check.gaccCat_seafood_labTest_1', 'Check.gaccCat_seasoning_labTest_4',
  'Check.gaccCat_classification_label',
  // Check: packaging types
  'Check.packagingCan', 'Check.packagingPlastic',
  // Check: product category labels
  'Check.catCcc_electronics', 'Check.catNmpa_makeup',
  // Check: topic/title labels with domain terms
  'Check.gaccHorizon_gb7718_topic', 'Check.gaccHorizon_cbec_topic', 'Check.gaccHorizon_aiLabel_topic',
  'Check.gaccCost_labelDesign_item', 'Check.gaccCommonRej_cause', 'Check.gaccCommonRej_solution',
  'Check.gaccDoc_riskAssessment_format', 'Check.gaccTimeline_label_name', 'Check.gaccTitle',
  'Check.labelRiskDim_additive', 'Check.labelRiskDim_cost', 'Check.labelRiskNote_cost',
  'Check.nmpaGlossary_icsc', 'Check.primaryNiceClass', 'Check.reportFooterEmail',
  'Check.reportModuleCrossborder', 'Check.resultProduct', 'Check.resultProductLabel', 'Check.reportProduct',
  // Check: compliance report section labels (domain-specific)
  'Check.cbGlossary_hsCode',
  // Check: {count} tests is identical in French (legitimate)
  'Check.nmpaRiskNote_tests',
  // ReportSection: domain-specific labels and values
  'ReportSection.compAllergens', 'ReportSection.customsClearance', 'ReportSection.nmpaSpecialLabel',
  'ReportSection.nmpaSpecialTimeline', 'ReportSection.channelSuitabilityMedium',
  'ReportSection.channelSuitabilityLow', 'ReportSection.compareChina',
  'ReportSection.customsLabTestingResp', 'ReportSection.customsPortArrivalResp',
  'ReportSection.customsClearanceResp', 'ReportSection.customsClearance',
  'ReportSection.emergencyScenario3Basis', 'ReportSection.fieldFormat', 'ReportSection.fieldLab',
  'ReportSection.fieldLimitation', 'ReportSection.fieldTurnaround', 'ReportSection.ipMonitorEnforce',
  'ReportSection.labelCause', 'ReportSection.labelCost', 'ReportSection.labelDimension',
  'ReportSection.labelDocument', 'ReportSection.labelEstCost', 'ReportSection.labelFormat',
  'ReportSection.labelGB28050Highlights', 'ReportSection.labelItem', 'ReportSection.labelLab',
  'ReportSection.labelNotes', 'ReportSection.labelPhase', 'ReportSection.labelPlatform',
  'ReportSection.labelQSSCLogo', 'ReportSection.labelSolution', 'ReportSection.labelTopCompetingOrigins',
  'ReportSection.labelTurnaround', 'ReportSection.labelVerdict',
  'ReportSection.sectionCBReportGuide', 'ReportSection.sectionHorizonScan',
  'ReportSection.sectionLabelCompliance', 'ReportSection.sectionMarketIntelligence',
  'ReportSection.sectionRiskAssessmentMatrix', 'ReportSection.sectionTrademarkWatchService',
  'ReportSection.timelineClient', 'ReportSection.tableHeaderPhase',
  'ReportSection.valueClassification', 'ReportSection.valueMFNRate', 'ReportSection.valueRegion',
  'ReportSection.valueVAT',
  // Home stats — numbers are always English
  'Home.stat1Number', 'Home.stat2Number', 'Home.stat3Number', 'Home.stat4Number', 'Home.stat4Label',
  // ThankYou stats
  'ThankYou.stat1Number', 'ThankYou.stat2Number', 'ThankYou.stat3Number', 'ThankYou.stat4Number',
  'ThankYou.readTime',
  // About — names are always English
  'About.expertName', 'About.teamMember1Name', 'About.teamMember2Name', 'About.teamMember3Name',
  'About.teamMember4Name', 'About.partners1', 'About.partners2', 'About.value1Title',
  // Blog
  'Blog.author', 'Blog.title', 'Blog.pagination',
  // Pricing — currency values are always English
  'Pricing.singlePrice', 'Pricing.professionalPrice', 'Pricing.monthlyPrice',
  // Quote
  'Quote.namePlaceholder', 'Quote.messageLabel', 'Quote.services.ecommerce',
  // Packages
  'Packages.comparisonFeature', 'Packages.advancedName',
  // IndustriesCommon
  'IndustriesCommon.metaDescription',
  // Remaining hardcoded fallbacks
  'Check.complianceNo', 'Check.cccDoc_cb_format',
  'ReportSection.squattingRiskLabel', 'ReportSection.squattingRealWorldCase',
  'ReportSection.animalTesting', 'ThankYou.stat4Label',
  // Blog categories label
  'Blog.categories',
  // Portal labels that need translation
  'Home.popular', 'ReportSection.client', 'Auth.email', 'Dashboard.email',
  // Portal CTA links — English placeholders pending translation assignment
  'Home.heroPortalCta',
  'ServiceCommon.portalCtaTitle',
  'ServiceCommon.portalCtaLink',
  'ServiceCommon.portalCtaGenericTitle',
  'ServiceCommon.portalCtaGenericLink',
  // Check — legitimate English abbreviations, standard codes, scientific terms
  'Check.cnipa_npc',
  'Check.china_rohs_2',
  'Check.douyin_global',
  'Check.gb_7718_2011_rev_2025',
  'Check.mofcom_gacc',
  // Check — dimension/category labels: domain terms with HS codes, legal/commercial terms
  'Check.cccDimension_cost', 'Check.labelDimension_cost', 'Check.nmpaDimension_cost', 'Check.tmDimension_cost',
  'Check.cccDimension_testing',
  'Check.nmpaCat_makeup_label', 'Check.cccCat_electronics_label',
  'Check.tmDimension_squatterRisk',
  'Check.reportClient', 'Check.reportVerdict',
  'Check.ndrc_mofcom_2020',
  'Check.nhc_cnca',
  'Check.asean_cosmetics_gmp',
  'Check.eu_cosmetics_gmp_iso_22716',
  'Check.us_fda_cgmp',
  'Check.aflatoxin_m1',
  'Check.clenbuterol_β_agonists',
  'Check.brand_auth_letter',
  'Check.formula_change_re_label',
  'Check.label_artwork',
  'Check.gb_7718_2011_under_revision',
  'Check.additive_codes',
  'Check.benzo_a_pyrene',
  'Check.additive_review',
  'Check.cbec_retail_import_policy',
  'Check.label_review',
  'Check.label_update_monitoring',
  'Check.publication_opposition',
  'Check.notification',
  'Check.nmpa_2021_tech_specs',
  'Check.mycotoxins_ochratoxin_a',
  'Check.miit_order_32_2016',
  'Check.microbiological_coliforms_pathogens',
  'Check.mycotoxins_aflatoxin_don_zearalenone',
  'Check.tetracycline_antibiotics',
  // Dashboard report status values — DB data stored in English, same across all locales
  'Dashboard.paid', 'Dashboard.pending',
  // Dashboard pagination — English-based labels, pending translation assignment
  'Dashboard.prev', 'Dashboard.next',
  // Difficulty labels — simple English terms acceptable across all locales
  'Check.gaccDifficultyEasy', 'Check.gaccDifficultyModerate', 'Check.gaccDifficultyDifficult',
  'ReportSection.difficulty_easy', 'ReportSection.difficulty_moderate', 'ReportSection.difficulty_difficult',
]);

function checkHardcodedFallbacks(projectName, projectData) {
  const { en, locales } = projectData;
  const issues = [];

  for (const lang of locales) {
    const langPath = path.join(
      projectName === 'site' ? SITE_MESSAGES_DIR :
      projectName === 'portal' ? PORTAL_MESSAGES_DIR :
      UI_MESSAGES_DIR,
      `${lang}.json`
    );
    const langFlat = loadJSON(langPath);
    if (!langFlat) continue;
    const langFlattened = flattenKeys(langFlat);

    for (const [key, enVal] of Object.entries(en)) {
      if (typeof enVal !== 'string' || enVal.length <= 2) continue;
      // Skip: key is in IGNORE_FALLBACK_KEYS (exact key match)
      if (IGNORE_FALLBACK_KEYS.has(key)) continue;
      const langVal = langFlattened[key] ?? '';

      // Skip: global ignore values (value matches across all languages)
      if (langVal === enVal && IGNORE_FALLBACK_VALUES.has(enVal)) continue;

      if (langVal === enVal) {
        const shortKey = key.split('.').pop() || key;
        const isKeyAsValue = enVal.toLowerCase() === shortKey.toLowerCase();
        issues.push({ locale: lang, key, value: enVal, isKeyAsValue });
      }
    }
  }

  return issues;
}

// ============================================================
// 生成 translate-tool 输入文件
// ============================================================
function generateTranslateInput(missingByProject) {
  const outputFile = '/tmp/i18n_missing_keys.json';
  const output = [];
  for (const [project, data] of Object.entries(missingByProject)) {
    for (const m of data.missing) {
      output.push({ project, locale: m.locale, key: m.key });
    }
  }
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  return outputFile;
}

// ============================================================
// Main
// ============================================================
const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const missingOnly = args.includes('--missing-only');
const generateInput = args.includes('--generate-input');
const skipPortal = args.includes('--skip-portal');

// 加载各站点
const siteData = loadProjectMessages('site');
const portalData = skipPortal ? null : loadProjectMessages('portal');
const uiData = loadProjectMessages('ui');

// 检查 key 完整性
const siteResult = checkKeyCompleteness('site', siteData);
const portalResult = portalData ? checkKeyCompleteness('portal', portalData) : { total: 0, missing: [], extra: [] };
const uiResult = checkKeyCompleteness('ui', uiData);

const missingByProject = { site: siteResult, portal: portalResult, ui: uiResult };

// 检查硬编码 fallback
const siteHardcoded = checkHardcodedFallbacks('site', siteData);
const portalHardcoded = portalData ? checkHardcodedFallbacks('portal', portalData) : { total: 0, missing: [], extra: [], hardcoded: [] };
const uiHardcoded = checkHardcodedFallbacks('ui', uiData);

if (generateInput) {
  const outputFile = generateTranslateInput(missingByProject);
  console.log(`✅ 缺失 key 清单已生成: ${outputFile}`);
  console.log(`   共 ${JSON.parse(fs.readFileSync(outputFile, 'utf-8')).length} 条`);
  process.exit(0);
}

if (missingOnly) {
  const result = {
    site: { missing: siteResult.missing.length, keys: siteResult.missing },
    portal: { missing: portalResult.missing.length, keys: portalResult.missing },
    ui: { missing: uiResult.missing.length, keys: uiResult.missing },
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// ============================================================
// 报告
// ============================================================
const projects = [
  { name: 'site', missing: siteResult.missing, extra: siteResult.extra, hardcoded: siteHardcoded },
  { name: 'portal', missing: portalResult.missing, extra: portalResult.extra, hardcoded: portalHardcoded },
  { name: 'ui', missing: uiResult.missing, extra: uiResult.extra, hardcoded: uiHardcoded },
];

console.log('🔑 i18n key 完整性检查');
console.log('');

let totalMissing = 0;
let totalExtra = 0;
let totalHardcoded = 0;

for (const proj of projects) {
  const missingCount = proj.missing.length;
  const extraCount = proj.extra.length;
  const hardcodedCount = proj.hardcoded.length;
  totalMissing += missingCount;
  totalExtra += extraCount;
  totalHardcoded += hardcodedCount;

  console.log(`📦 ${proj.name.toUpperCase()} (${proj.missing.length} missing, ${proj.extra.length} extra, ${proj.hardcoded.length} hardcoded):`);

  if (missingCount > 0) {
    const byKey = {};
    for (const m of proj.missing) {
      if (!byKey[m.key]) byKey[m.key] = [];
      byKey[m.key].push(m.locale);
    }
    const sortedKeys = Object.entries(byKey).sort((a, b) => b[1].length - a[1].length);
    for (const [key, langs] of sortedKeys) {
      const flag = langs.length === LOCALES.length ? '🔴' : '🟡';
      console.log(`  ${flag} ${key}: 缺失于 ${langs.length}/${LOCALES.length} 语言`);
    }
  }

  if (extraCount > 0) {
    console.log(`  ℹ️  多余 key (${extraCount} 处，lang 中有但 en 中没有):`);
    for (const e of proj.extra.slice(0, 20)) {
      console.log(`    [${e.locale}] ${e.key} → "${e.value}"`);
    }
    if (extraCount > 20) console.log(`    ... 还有 ${extraCount - 20} 条`);
  }

  if (hardcodedCount > 0) {
    const byKey = {};
    for (const h of proj.hardcoded) {
      if (!byKey[h.key]) byKey[h.key] = { value: h.value, isKeyAsValue: h.isKeyAsValue, count: 0 };
      byKey[h.key].count++;
    }
    console.log(`  ⚠️  硬编码英文 fallback (${hardcodedCount} 处):`);
    for (const [key, info] of Object.entries(byKey)) {
      const flag = info.isKeyAsValue ? '🔴' : '🟡';
      console.log(`    ${flag} ${key} → "${info.value}" (${info.count} 语言)`);
    }
  }

  if (missingCount === 0 && extraCount === 0 && hardcodedCount === 0) {
    console.log('  ✅ 全部通过');
  }
  console.log('');
}

console.log(`📊 总计: ${totalMissing} 缺失 + ${totalExtra} 多余 + ${totalHardcoded} 硬编码英文`);

if (totalMissing > 0 || totalHardcoded > 0) {
  if (isCi) process.exit(1);
} else {
  console.log('✅ 所有 i18n key 完整，无硬编码英文');
}
