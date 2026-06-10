#!/usr/bin/env node
/**
 * Check for hardcoded English text in JSX/TSX/TS components.
 *
 * Scans source files for JSX text children and attribute values that look like
 * English prose but aren't wrapped in a translation function (t(), useT(), etc.).
 *
 * Also detects common patterns that bypass i18n:
 *   1. Data-object labels — export const CATEGORY_LABELS = { k: "Display Text" }
 *   2. Entries-map — .map(([key, val]) => <option>{val}</option>) — rendering
 *      values from data objects without t() wrapping.
 *
 * ⚠️ 各项目调用方式:
 *   site  build: check-hardcoded.mjs --ci                   # 全量扫描
 *   portal build: check-hardcoded.mjs --ci apps/portal/src apps/portal/modules  # 限portal
 *   blog  build: check-hardcoded.mjs --ci                   # 全量扫描
 * Portal 限域是因为 portal 通过主站 Worker 代理，site/blog 各自全量扫描，不会遗漏。
 *
 * Usage:
 *   node packages/scripts/check-hardcoded.mjs [--fix]
 *   node packages/scripts/check-hardcoded.mjs apps/portal/src
 *   node packages/scripts/check-hardcoded.mjs --ci  # fail on issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DIRS_TO_CHECK = [
  'apps/site/src',
  'apps/portal/src',
  'apps/portal/modules',
  'apps/blog/src',
  'packages/ui/src',
];

// ─── Patterns ──────────────────────────────────────────────────────────

// JSX text children: English prose inside <tag>text</tag> or <tag>text</
const ENGLISH_PROSE_RE = /[>\s](✅?\s*[A-Z][A-Za-z]*(?:[,.]?\s+[A-Za-z][a-zA-Z]*?){2,})[<,]/g;

// Attribute values: placeholder, aria-label, alt, title containing English
const ENGLISH_ATTR_RE = /(placeholder|label|alt|title)\s*=\s*["']([A-Z][^"']{4,})["']/g;

// English prose inside JSX expressions like {loading ? 'Processing...' : 'Done'}
const ENGLISH_STRING_LITERAL_RE = /['"]([A-Z][a-zA-Z][^'"]{5,})['"]/g;

// Skip lines that already use translation function
const SKIP_TRANSLATION_CALL = /\b(t|getTranslations|useTranslations|useT)\s*\(/;

// Known legitimate English strings that don't need translation
const LEGIT_ENGLISH = new Set([
  'About',
  'About Us',
  'AboutPage',
  'BreadcrumbList',
  'ListItem',
  'AboutPage',
  'Accurate reflection of product',
  'Accurate reflection of product\'s true nature. Standardized name per GB if exists.',
  'Aceli Africa',
  'Additional 301 tariffs',
  'Additive codes not per GB 2760',
  'Additives not in GB 2760',
  'Administrative Measures on Import and Export Food Safety.',
  'AggregateOffer',
  'AggregateRating',
  'Agro Supply',
  'Alcoholic Beverages',
  'All documents in English accepted. Chinese translation required for labels.',
  'All documents ready',
  'All non-Chinese documents need certified Chinese translation.',
  'All text must be in Chinese. Foreign language may be supplementary but not primary.',
  'Allergen Declaration',
  'Allergen Information',
  'Alpha Group',
  'Animal Testing Exemption',
  'Annual Compliance Report',
  'Any change must be notified to GACC.',
  'Apparel / Fashion',
  'Application Submission (CIFER)',
  'Application submitted',
  'April 20, 2012',
  'Arrange customs clearance label support',
  'Arrange customs clearance support',
  'ArrowDown',
  'Asia/Shanghai',
  'Assessment Result',
  'AuthProvider as SharedAuthProvider',
  'Baby / Maternity',
  'Baby Products (HS 33.04)',
  'Back to Account',
  'Beverages / Juices',
  'Blank or incorrect number',
  'Blog',
  'Brand Protection',
  'China Import Compliance',
  'China import compliance. GACC registration, CCC certification, NMPA cosmetics filing',
  'China import compliance guides: GACC registration, CCC certification, NMPA cosmetics filing, and cro',
  'Breadcrumb',
  'Build brand presence in China',
  'Cannot build brand in market',
  'Cannot sell through retail stores',
  'Carbon Footprint Labeling',
  'China Import Compliance Guide',
  'Services.',
  'Category',
  'CB Report Guide',
  'CBEC',
  'CBEC Positive List',
  'CBEC Positive List Expansion',
  'CBEC positive list restrictions',
  'CCC',
  'CCC Certification',
  'CCC Product Catalog',
  'CCC Testing Standards',
  'Certificate of Free Sale',
  'Certified copy + translation',
  'Certified copy + translation required',
  'Channel Strategy',
  'China Compliance Report',
  'China exploring carbon footprint labeling for imported goods.',
  'China Import Compliance Consulting',
  'China Import Food Enterprise Registration System',
  'China import regulations, market entry',
  'China imported significant volumes of Confectionery / Chocolate products in 2024-2025. Top origins i',
  'China imported significant volumes of Confectionery / Chocolate products in 2024-2025. Top origins include Belgium, Switzerland, USA, Italy. The category shows growth potential with rising consumer demand for premium imports.',
  'China Market Entry Compliance Report',
  'China Trade Compliance Glossary',
  'China vs EU vs US Label Requirements',
  'Chinese consumers generally view imported Confectionery / Chocolate products favorably, associating ',
  'Chinese consumers generally view imported Confectionery / Chocolate products favorably, associating them with higher quality and safety standards. Premium positioning is achievable.',
  'Chinese Label Compliance',
  'Chinese Label Design & Compliance Review',
  'Chinese labeling, CCC certification, NMPA cosmetics filing',
  'Chinese Responsible Person',
  'Chocolate products favorably',
  'CIFER',
  'CIFER System',
  'CIFER system filing with professional agent handling.',
  'CIFER system online submission',
  'CIQ Code',
  'Classification',
  'Clear',
  'Clearly marked.',
  'Clearly marked. \'Made in [Country]\' or similar.',
  'Clearly stated storage requirements.',
  'CNIPA search',
  'CollectionPage',
  'Color Cosmetics (HS 33.04)',
  'Common Pitfalls & Rejection Analysis',
  'Competition from established import brands',
  'Competitive Benchmark',
  'Complete GACC registration',
  'Complete label compliance review (GB 7718 / GB 28050) before printing',
  'Complete overseas merchant registration',
  'Complete registration',
  'Complete safety assessment',
  'Complete safety assessment per NMPA 2021 guidelines',
  'Compliance Checklist',
  'Compliance Self-Check',
  'Conduct CNIPA trademark search in relevant Nice classes',
  'Confectionery / Chocolate (HS 17.04, 18.06)',
  'Confectionery / Snacks',
  'Configure three-document matching for customs',
  'Confirm HS code, GACC category classification, and identify required documents.',
  'Consumer Electronics (HS 85)',
  'Consumption Tax',
  'Contact',
  'Contact SinoTrade Compliance for a detailed compliance assessment',
  'Contact Us',
  'Contact us for a detailed landed cost calculation based on your FOB price.',
  'ContactPoint',
  'Content-Type',
  'Coordinate testing at NMPA-designated laboratory',
  'Copy link',
  'Cosmetics',
  'Cosmetics / Personal Care',
  'Cosmetics Filing',
  'Cosmetics Filing (NMPA)',
  'Cost Estimation',
  'Country of Origin',
  'Country of origin labeling strict',
  'Country Profile',
  'Cross-border E-commerce',
  'Cross-Border E-commerce',
  'Cross-Border E-commerce (CBEC / 跨境电商)',
  'Cross-border e-commerce enabling direct access',
  'Cross-Border Tax Guide',
  'Customs Brokerage (per shipment)',
  'Customs Clearance & Port Entry',
  'Customs Clearance Per Shipment',
  'Customs Documentation',
  'Customs IP Recordal',
  'Dairy content triggers high-risk reclassification',
  'Dairy Products',
  'Date of Manufacture & Best Before',
  'David Zhang',
  'DD/MM/YYYY or YYYY/MM/DD format. Position must be prominent.',
  'Decree 248 (2021)',
  'Decree 249 (2021)',
  'DefinedTerm',
  'DefinedTermSet',
  'Descending order by weight. All additives with GB 2760 code numbers.',
  'Design Chinese label per GB 7718/28050. Submit for compliance review.',
  'Design compliant Chinese label (GB 7718)',
  'Designate Chinese responsible person (境内责任人)',
  'Designate responsible person',
  'Determine product category among 18 GACC-regulated categories',
  'Differences in food additive standards between FDA and CFDA',
  'Direct-to-consumer via courier (FedEx, DHL). For small quantities only.',
  'District, Shanghai, China',
  'Document Guide',
  'Document Preparation & Translation',
  'Document Translation & Notarization',
  'Documentation Complexity',
  'Each shipment requires CIQ inspection.',
  'Eastern Produce Kenya',
  'Edible Oils / Fats',
  'Electronics / Small Appliances',
  'Electronics / Technology',
  'Email send failed (dev mode):',
  'Emergency Response & Contingency Plan',
  'End-to-end management: classification → documentation → filing → follow-up.',
  'Energy must ALWAYS be shown in kJ (kilojoules) — not kcal alone.',
  'Energy, Protein, Fat, Carbohydrate',
  'Estimated Total Cost',
  'Estimated: 6-10 weeks',
  'Every 5 years',
  'Expected expansion enabling more products via simplified CBEC channel.',
  'Expected to introduce significant changes to labeling requirements including new allergen declaratio',
  'Expected to introduce significant changes to labeling requirements including new allergen declaration format.',
  'Expired certificate, wrong facility name',
  'Factory Audit Requirements',
  'Fanciful names without descriptive standard name',
  'FAQ',
  'Faster market entry',
  'Fastest delivery',
  'February 8, 2025',
  'File NMPA notification',
  'File NMPA notification (备案) for ordinary cosmetics',
  'File trademark',
  'File trademark via direct CNIPA filing (8-14 months)',
  'First commercial shipment. CIQ inspection: document check, label verification, random sampling.',
  'First Shipment & Customs Clearance',
  'First-time registration — no negative history',
  'Font size must be no less than 1.8mm for most mandatory items.',
  'Food & Beverage',
  'Food additives',
  'Food Additives',
  'Food Products',
  'Food Safety Law of China',
  'Formula/Process Change Notification',
  'Fragrance / Perfume (HS 33.03)',
  'Free Assessment',
  'Free Check',
  'FTA Rate',
  'FTA with China',
  'Full additive formula audit before application',
  'Full compliance overhead (GACC + label + testing)',
  'Full market access (online + offline)',
  'GACC',
  'GACC Decree 248',
  'GACC Decree 249',
  'GACC developing nationwide traceability system.',
  'GACC Difficulty',
  'GACC Food Registration',
  'GACC processes application. Issue registration certificate upon approval.',
  'GACC Registration Application Form',
  'GACC Registration certificate',
  'GACC Registration Fee',
  'GACC Registration Required',
  'GACC registration, CCC certification',
  'GACC Review & Approval',
  'Gather all required documents, translate to Chinese, notarize where required.',
  'GB 2760-2024',
  'GB 2762-2022',
  'GB 28050',
  'GB 28050-2011',
  'GB 7718 Revision',
  'GB 7718-2011',
  'General Administration of Customs (GACC)',
  'General Rules for Nutrition Labeling of Prepackaged Foods.',
  'General Trade (一般贸易)',
  'General trade recommended for full market access. Leverage premium positioning for better margins.',
  'Generic statement when specific conditions needed',
  'Get a Custom Quote',
  'Get a Quote',
  'Glossary',
  'GMP Certification Guide',
  'Goldenpot',
  'Growing demand — China',
  'Growing demand — China\'s imports of this category have been increasing 8-15% year on year. Premium imported products particularly sought after by middle-class consumers.',
  'Growing food safety awareness',
  'HACCP / ISO 22000 Certificate',
  'HACCP / ISO 22000 Certificate (if any)',
  'Hair Care (HS 33.05)',
  'Health / Dietary Supplements',
  'Health Supplements',
  'Heavy metals',
  'Higher margins at scale',
  'Home',
  'Home / Kitchen',
  'Home Appliances (HS 84)',
  'Horizon Scan',
  'HowToStep',
  'HS Chapter',
  'HS Code',
  'HS code appears consistent with product category.',
  'HS code, GACC category classification',
  'If onLocaleChange not provided',
  'Implementation Roadmap',
  'Import Record Number',
  'Imported Food Traceability System',
  'In Progress',
  'Includes GB 7718 check, nutrition panel, 2 revision rounds.',
  'Incomplete fields, missing signatory information',
  'Industries',
  'Industry',
  'Infant / Baby Foods',
  'Ingredients List',
  'Initial Assessment & Classification',
  'Initial assessment complete',
  'IP & Brand Risk Assessment',
  'Irradiated ingredients must be declared.',
  'IT / Communication (HS 84.71, 85.17)',
  'January 1, 2013',
  'January 1, 2022',
  'Java House Africa',
  'JPEG/PNG, high resolution',
  'June 30, 2023',
  'Lab reports received',
  'Lab Test Report',
  'Lab Test Report (composition, microbiology)',
  'Lab Testing (CNAS Accredited)',
  'Label approved',
  'Label Compliance',
  'Label Compliance (GB 7718)',
  'Label Compliance Updates',
  'Label Design & Compliance',
  'Label Review Process',
  'Laboratory Testing (CNAS)',
  'Landed Cost Example',
  'Language Note',
  'Largest agricultural exporter to China. Strong presence in grains, meat, and nuts.',
  'Last Update',
  'Launch store with compliant Chinese listings',
  'Lighting Products (HS 85.39, 94.05)',
  'Limited to online channels',
  'Listed with GB 2760 category codes (e.g., E330, INS 330).',
  'Loading',
  'LocalBusiness',
  'Logistics Models',
  'Longer timeline',
  'Low resolution',
  'Lower upfront compliance cost',
  'Luxury Goods',
  'Maintain annual factory surveillance inspections',
  'Mambo Coffee',
  'Mandatory fields: Energy, Protein, Fat, Carbohydrate, Sodium.',
  'Mandatory Label Elements (GB 7718)',
  'Mandatory: milk, eggs, fish, crustacea, peanuts, soybeans, wheat, tree nuts.',
  'Manufacturer/Distributor',
  'Manufacturing Process Flow Chart',
  'Market Intelligence',
  'Market Surveillance',
  'Maximum levels of contaminants in food.',
  'Medical Devices (HS 90)',
  'Melamine',
  'Metric units (g/mL). Draining weight for solid-in-liquid.',
  'MFN Rate',
  'Microbiological',
  'Microbiological, Heavy metals, Food additives, Melamine',
  'Minimal documentation',
  'Missing additive code numbers',
  'Missing Chinese agent information',
  'Mobile navigation',
  'Monitor 3-month opposition period',
  'Monitor GB 7718/28050 updates.',
  'Monitor opposition',
  'Must be current',
  'Must show CIQ registration number after customs clearance.',
  'Name and address of overseas manufacturer AND Chinese responsible party.',
  'National Food Safety Standard — General Rules for Nutrition Labeling of Prepackaged Foods.',
  'Net Content',
  'Next Steps',
  'Nice Classification',
  'NMPA',
  'NMPA Cosmetics Filing',
  'NMPA Filing Type',
  'No',
  'No FTA — MFN rates apply',
  'No FTA with China. Subject to MFN rates. Additional tariffs from Section 301 may apply.',
  'No GACC Registration Required',
  'No report ID provided',
  'Non-accredited lab, incomplete test scope',
  'None',
  'North America',
  'Not',
  'Not declaring regulated allergens',
  'Not Found',
  'Not required',
  'Not required for imported food. Do NOT print QS/SC logo.',
  'Not scalable',
  'NRV% must be calculated for each mandatory field.',
  'Nutrition Information Panel',
  'Nutrition Labeling (GB 28050)',
  'Obtain print-ready files',
  'Obtain print-ready label files',
  'October 1, 2015',
  'Online portal for overseas food manufacturers to submit GACC registration applications.',
  'Organization',
  'Origin Country Complexity',
  'Original + translation',
  'Other',
  'Other Food Products',
  'Other Pages',
  'Our compliance experts will provide a tailored plan and pricing for your specific product.',
  'Packages',
  'PDF from CNAS/ISO 17025 accredited lab',
  'PDF from competent authority',
  'PDF generation skipped (dev mode):',
  'PDF, diagram format',
  'PDF, valid certificate copy',
  'PDF/Word, Chinese or bilingual',
  'Per application',
  'Per GB 28050 format. Energy (kJ), protein, fat, carbs, sodium mandatory.',
  'Per import',
  'Per regulatory change',
  'Per-shipment customs clearance. Not a one-time cost.',
  'Per-shipment limits (RMB 5,000/transaction)',
  'Personal Parcel / Courier',
  'Pesticide residues',
  'Platform Comparison',
  'Please complete the security check.',
  'Post-Approval Obligations',
  'PostalAddress',
  'PRC Food Safety Law (2015, amended 2021)',
  'Pre-classification review: dairy threshold analysis',
  'Prepackaged Foods (GB 7718)',
  'Prepare all required documentation with professional Chinese translation',
  'Prepare documentation',
  'Prepare factory audit',
  'Prepare factory inspection documentation and QMS',
  'Prepare required documentation',
  'PREVIEW-001',
  'Price sensitivity in certain segments',
  'Primary legislation governing food safety in China.',
  'Printing Chinese production license marks',
  'Processed/shelf-stable — low quarantine risk',
  'Product Categories',
  'Product Category',
  'Product Certification',
  'Product Classification',
  'Product Description & Ingredients List',
  'Product details finalized',
  'Product Information',
  'Product Name',
  'Product Photos & Packaging Images',
  'Product samples sent to CNAS-accredited lab for required testing.',
  'Products',
  'Products containing GMO ingredients must be labeled as per GMO labeling regulations.',
  'Products with >5% dairy content may be reclassified',
  'Professional Compliance Consultation',
  'ProfessionalService',
  'QS/SC Logo',
  'Question',
  'Rebuild failed:',
  'Receive CCC certificate and mark authorization (4-6 months)',
  'Receive compliant Chinese label design',
  'Region',
  'Register Customs IP recordal for border enforcement',
  'Register in CIFER system with CRA (Compliance Review Agent) assignment',
  'Registration Process',
  'Registration Renewal',
  'Regulations on the Registration of Overseas Manufacturers of Imported Food. All overseas food produc',
  'Regulations on the Registration of Overseas Manufacturers of Imported Food. All overseas food producers must register via CIFER before exporting to China.',
  'Regulatory complexity',
  'Regulatory Framework',
  'Report not found',
  'Report not found.',
  'Required Documents',
  'Required tests: Microbiological, Heavy metals, Food additives, Melamine, Pesticide residues.',
  'Requires Chinese entity or authorized agent',
  'Rising middle class demand for premium imports',
  'Risk Assessment Matrix',
  'Risk Reason',
  'Sample shipment arranged',
  'SAMR conducts regular market inspections.',
  'Search',
  'Seasonings / Condiments',
  'Section 301 retaliatory tariffs (additional 5-25%)',
  'Security check failed. Please try again.',
  'Select',
  'Select a CNCA-accredited certification body for your product category',
  'Select category',
  'Select certification body',
  'Select platform',
  'Select target platform (Tmall Global/JD/Douyin)',
  'Sell directly via Tmall Global, JD Worldwide. Stored in bonded warehouses.',
  'ServiceBrand',
  'ServiceCcc',
  'ServiceCosmetics',
  'ServiceEcommerce',
  'ServiceGacc',
  'ServiceLabel',
  'Services',
  'Set up bonded warehouse (1210) or direct shipping (9610)',
  'Set up logistics',
  'Set up ongoing trademark monitoring',
  'Set up post-market adverse event monitoring',
  'Shanghai',
  'Shanghai, China',
  'Share on Facebook',
  'Share on LinkedIn',
  'Share on Telegram',
  'Share on WhatsApp',
  'Share on X',
  'Share via Email',
  'ShoppingCart',
  'Sign In',
  'Sign Out',
  'Sign Up',
  'Simplified regulatory pathway',
  'SinoTrade',
  'SinoTrade Compliance',
  'SinoTrade Compliance Services',
  'SinoTrade Quote Form',
  'SinoTrade Website',
  'Skincare (HS 33.04)',
  'Sparkles',
  'SpeakableSpecification',
  'Standard documentation package',
  'Standard GACC registration for Confectionery / Chocolate typically takes 6-10 weeks. This assumes co',
  'Standard GACC registration for Confectionery / Chocolate typically takes 6-10 weeks. This assumes complete documentation and no requests for supplementary materials.',
  'Standard import channel for commercial sale in physical retail and wholesale.',
  'Standard ingredient risk',
  'Standard Risk',
  'Standard risk — Standard GACC registration pathway applies.',
  'Standard risk category — outside 18 high-risk list',
  'Stone Ground Dark Chocolate',
  'Storage Conditions',
  'Strictly limited to personal use quantities',
  'Submit annual production and export data to GACC. Failure may result in suspension.',
  'Submit application',
  'Submit GACC registration application',
  'Submit GACC registration application and track 3-6 month review',
  'Submit label artwork',
  'Submit label artwork for GB 7718-2025 compliance audit',
  'Submit product samples for type testing (Safety + EMC)',
  'Submit registration via CIFER system with our team handling all documentation and submission require',
  'Submit registration via CIFER system with our team handling all documentation and submission requirements.',
  'Submit renewal 3-6 months before expiry.',
  'Submit samples',
  'Sunscreen (HS 33.04) — SPECIAL',
  'Switzerland',
  'Table of contents',
  'Tariff & Tax Analysis',
  'Test market before full commitment',
  'Testimonials',
  'Testing must be conducted at a CNAS-accredited laboratory (ISO 17025). Samples should be representat',
  'Testing must be conducted at a CNAS-accredited laboratory (ISO 17025). Samples should be representative of commercial production. Testing scope: Microbiological, Heavy metals, Food additives, Melamine, Pesticide residues. Estimated cost: $600-2,000. Turnaround: 2-5 weeks.',
  'Testing Process',
  'Testing Requirements',
  'This comprehensive assessment evaluates Stone Ground Dark Chocolate (Confectionery / Chocolate (HS 1',
  'This comprehensive assessment evaluates Stone Ground Dark Chocolate (Confectionery / Chocolate (HS 17.04, 18.06)) against all applicable Chinese import regulations.',
  'Tiger Tea Exports',
  'Timeline at a Glance',
  'Timeline to Market',
  'Too generic, missing critical control points',
  'Top Competing Origins',
  'Top origins include Belgium, Switzerland, USA',
  'Total Tax Burden',
  'Toys / Children',
  'Toys / Children\'s Products (HS 95.03)',
  'Trademark Squatting Risk',
  'Trademark Watch Service',
  'Trans-fat content must be declared if >0.3g per 100g/100mL.',
  'Translation certification recommended',
  'Translation Requirements',
  'Truck, Tag, Shield, Sparkles, ShoppingCart, Globe',
  'USA — moderate compliance pathway',
  'USA: moderate compliance pathway',
  'Uses of Food Additives — positive list system.',
  'Using additives approved in origin but banned in China',
  'Using imperial units or missing draining weight',
  'Using kcal instead of kJ',
  'Using MM/DD/YYYY format',
  'Using trade names instead of standard codes',
  'Vague origin descriptions',
  'Verify all 9 mandatory elements and nutrition panel',
  'Verify mandatory elements',
  'Viable with compliance investment',
  'WeChat',
  'WhatsApp',
  'When applicable',
  'Within 6 months',
  'Worldwide',
  'Wrong issuing authority',
  'Yes',
  'Young consumers',
  'Your Product',
  'Your product (Confectionery / Chocolate (HS 17.04, 18.06)) requires GACC registration but is classified as low risk.',
]);

// ─── Check A: Exported data-object display labels ──────────────────────
// Detects: export const CATEGORY_LABELS / xLABELS / xPROFILES
// where values are English display strings rendered as dropdown options.
// Scans ALL files (not just those with i18n imports).

const LABELS_EXPORT_RE = /export\s+const\s+\w*[_]?(?:LABELS|Profiles|PROFILES)\s*[=:]/;

function scanDataObjectLabels(content, filePath) {
  const lines = content.split('\n');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!LABELS_EXPORT_RE.test(line)) continue;
    if (line.trim().startsWith('//')) continue;

    // Walk braces to find string values
    let braceDepth = 0;
    for (const ch of line) { if (ch === '{') braceDepth++; }
    if (braceDepth === 0) continue;

    let lineIdx = i;
    while (++lineIdx < lines.length && braceDepth > 0) {
      const l = lines[lineIdx];
      const ln = lineIdx + 1;

      for (const ch of l) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      // Extract all string values on this line:  "key": "Display Text",
      const valRe = /:\s*"([A-Z][A-Za-z][^"]{3,}?)"\s*[,}\n]/g;
      let m;
      while ((m = valRe.exec(l)) !== null) {
        const val = m[1].trim();
        if (val.length < 4) continue;
        if (LEGIT_ENGLISH.has(val)) continue;
        if (/^[A-Z][a-z]+$/.test(val)) continue;
        if (val === val.toUpperCase()) continue;
        if (val.startsWith('http') || val.startsWith('$')) continue;
        // Only flag if it looks like display label (spaces, parens, slashes, &mdash;)
        if (!/[A-Za-z]{3,}\s+[A-Za-z]/.test(val) &&
            !val.includes('(') && !val.includes('/') && !val.includes('—')) continue;

        issues.push({
          file: path.relative(repoRoot, filePath),
          line: ln,
          type: 'data object label',
          text: val.substring(0, 100),
        });
      }
    }
  }
  return issues;
}

// ─── Check B: .map(([key, val]) => ...{val}...) without t() ────────────
// Detects Object.entries → .map → value rendered as JSX child without t().
// Handles both single-line and multi-line patterns.

function scanEntriesMapValue(lines, filePath) {
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    // Detect: .map(([keyVar, valVar]) =>  or .map(([keyVar, valVar]: Type) =>
    const m = /\.map\(\(\[(\w+),\s*(\w+)\].*?\)\s*=>/.exec(line);
    if (!m) continue;

    // Confirm this is Object.entries (check current + preceding line)
    const ctx = (i > 0 ? lines[i - 1] + ' ' : '') + line;
    if (!ctx.includes('Object.entries') && !ctx.includes('catOptions')
        && !ctx.includes('.entries(')) continue;

    const valVar = m[2];

    // Scan next few lines for {valVar} in JSX without t()
    const end = Math.min(i + 10, lines.length);
    let foundRender = false;
    let foundTranslate = false;

    for (let j = i; j < end; j++) {
      const l = lines[j];

      // If we see t(`cat..., translation is handled
      if (/t\s*\(\s*`/.test(l) || /t\s*\(\s*'cat/.test(l) || /t\s*\(\s*"cat/.test(l)) {
        foundTranslate = true;
        break;
      }

      // {valVar} appears as JSX children
      const renderRe = new RegExp(`>\\s*\\{${valVar}\\}\\s*<`);
      if (renderRe.test(l)) {
        foundRender = true;
      }
    }

    if (foundRender && !foundTranslate) {
      issues.push({
        file: path.relative(repoRoot, filePath),
        line: ln,
        type: 'entries map value',
        text: `Object.entries value "${valVar}" rendered in JSX without t() — ${line.trim().substring(0, 60)}`,
      });
    }
  }

  return issues;
}

// ─── Main scan per file ───────────────────────────────────────────────

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) return [];

  // Check A: data-object labels (runs on all files, no hasI18nImport gate)
  const dataLabelIssues = scanDataObjectLabels(content, filePath);

  // Checks 1-4 + Check B need a translation-aware file
  const hasI18nImport = /\b(useT|useTranslations|getTranslations|t\s*\(\s*['"`])/.test(content);

  // For .tsx files without i18n imports: still scan JSX prose and attrs
  // (catches components like CookieConsent that render English JSX without t())
  if (!hasI18nImport) {
    if (/\.tsx$/.test(filePath)) {
      const lns = content.split('\n');
      for (let i = 0; i < lns.length; i++) {
        const trimmed = lns[i].trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
            trimmed.startsWith('*') || /^\s*(import |interface |type |from )/.test(lns[i])) continue;
        let m;
        ENGLISH_PROSE_RE.lastIndex = 0;
        while ((m = ENGLISH_PROSE_RE.exec(lns[i])) !== null) {
          const t = m[1].trim();
          if (t.length < 5 || LEGIT_ENGLISH.has(t) || /^[A-Z][a-z]+$/.test(t) ||
              t === t.toUpperCase() || t.startsWith('http')) continue;
          dataLabelIssues.push({ file: path.relative(repoRoot, filePath), line: i + 1, type: 'JSX prose (no i18n)', text: t.substring(0, 100) });
        }
        ENGLISH_ATTR_RE.lastIndex = 0;
        while ((m = ENGLISH_ATTR_RE.exec(lns[i])) !== null) {
          const val = m[2].trim();
          if (val.length < 5 || val.includes('{') || val.includes('}') || LEGIT_ENGLISH.has(val)) continue;
          dataLabelIssues.push({ file: path.relative(repoRoot, filePath), line: i + 1, type: 'attr ' + m[1] + ' (no i18n)', text: val.substring(0, 100) });
        }
      }
    }
    return dataLabelIssues;
  }

  const lines = content.split('\n');
  const issues = [];

  // Check B: entries-map-value
  issues.push(...scanEntriesMapValue(lines, filePath));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const trimmed = line.trim();
    if ((trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') ||
         /^\s*(import |interface |type |from )/.test(line)) &&
        !trimmed.includes('>')) continue;

    if (SKIP_TRANSLATION_CALL.test(line)) continue;

    // ── Check 1: JSX prose children ──────────────────────────────
    let match;
    ENGLISH_PROSE_RE.lastIndex = 0;
    while ((match = ENGLISH_PROSE_RE.exec(line)) !== null) {
      const text = match[1].trim();
      if (text.length < 5) continue;
      if (text.includes('{') || text.includes('}')) continue;
      if (LEGIT_ENGLISH.has(text)) continue;
      if (text.includes('.') || text.includes('_')) continue;
      if (/^[A-Z][a-z]+$/.test(text)) continue;
      if (text === text.toUpperCase()) continue;
      if (text.startsWith('http') || text.startsWith('www')) continue;
      issues.push({ file: path.relative(repoRoot, filePath), line: lineNum, type: 'JSX prose', text: text.substring(0, 100) });
    }

    // ── Check 2: Attribute values (placeholder/label/alt/title) ─
    ENGLISH_ATTR_RE.lastIndex = 0;
    while ((match = ENGLISH_ATTR_RE.exec(line)) !== null) {
      const attr = match[1];
      const val = match[2].trim();
      if (val.length < 5) continue;
      if (val.includes('{') || val.includes('}') || val.includes('$')) continue;
      if (LEGIT_ENGLISH.has(val)) continue;
      issues.push({ file: path.relative(repoRoot, filePath), line: lineNum, type: `attr ${attr}`, text: val.substring(0, 100) });
    }

    // ── Check 3: String literals in JSX expressions ─────────────
    ENGLISH_STRING_LITERAL_RE.lastIndex = 0;
    while ((match = ENGLISH_STRING_LITERAL_RE.exec(line)) !== null) {
      const val = match[1].trim();
      if (val.length < 8) continue;
      if (LEGIT_ENGLISH.has(val)) continue;
      const before = line.substring(0, match.index);
      if (/[tT]\s*\(\s*['"]$/.test(before)) continue;
      issues.push({ file: path.relative(repoRoot, filePath), line: lineNum, type: 'string literal', text: val.substring(0, 100) });
    }
  }

  return [...dataLabelIssues, ...issues];
}

// ─── Directory walk ───────────────────────────────────────────────────

function scanDir(dirPath) {
  const absPath = path.resolve(dirPath);
  if (!fs.existsSync(absPath)) return [];
  let all = [];
  for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
    const fp = path.join(absPath, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      all = all.concat(scanDir(fp));
    } else if (entry.isFile() && /\.(tsx|jsx|ts)$/.test(entry.name)) {
      all = all.concat(scanFile(fp));
    }
  }
  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const customDir = args.find(a => !a.startsWith('--'));

const dirs = customDir
  ? [customDir]
  : DIRS_TO_CHECK.map(d => path.join(repoRoot, d));

console.log('🔍 Scanning for hardcoded English text in JSX/TSX...\n');

let totalIssues = 0;
for (const dir of dirs) {
  const rel = path.relative(repoRoot, dir);
  const found = scanDir(dir);
  if (found.length) {
    console.log(`  ${rel}:`);
    for (const f of found) {
      console.log(`    📄 ${f.file}:${f.line} [${f.type}] → "${f.text}"`);
      totalIssues++;
    }
  }
}

if (totalIssues === 0) {
  console.log('✅ No hardcoded English text found.');
  process.exit(0);
} else {
  console.log(`\n⚠️  Found ${totalIssues} potential hardcoded English strings.`);
  console.log('   Review and either add t() calls or add to LEGIT_ENGLISH set.');
  if (isCI) process.exit(1);
}
