#!/usr/bin/env node
/**
 * check-t-keys-all.mjs — 通用 t() 键存在性检查（全站点）
 *
 * 扫描项目源码中的 t("key") 和 t(`...`) 调用，验证所有引用的键
 * 是否在对应项目的 en.json 中存在。
 *
 * 与 apps/portal 特有的 check-t-keys.mjs（含 Part B 展开逻辑）互补，
 * 本脚本为全站点通用版本，仅做静态检查和基础模板前缀验证。
 *
 * 用法:
 *   node packages/scripts/check-t-keys-all.mjs
 *   node packages/scripts/check-t-keys-all.mjs --ci
 *   node packages/scripts/check-t-keys-all.mjs --project=site
 *
 * 退出码: 0 通过, 1 失败
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function getDetectedProject() {
  const idx = process.argv.findIndex(a => a.startsWith('--project='));
  if (idx !== -1) return process.argv[idx].split('=')[1];
  const cwd = process.cwd();
  const m = cwd.match(/[/]apps[/]([^/]+)/);
  return m ? m[1] : 'site';
}

const detectedProject = getDetectedProject();
const isCi = process.argv.includes('--ci');

// 项目消息目录 + 扫描目录
const PROJECT_MSG_DIR = path.join(REPO_ROOT, 'apps', detectedProject, 'messages');
const EN_JSON = path.join(PROJECT_MSG_DIR, 'en.json');

const SCAN_DIRS = [
  path.join(REPO_ROOT, 'apps', detectedProject, 'src'),
  path.join(REPO_ROOT, 'packages/ui/src'),
];

// 额外数据目录（如 portal 的 modules/）
const projectModules = path.join(REPO_ROOT, 'apps', detectedProject, 'modules');
if (fs.existsSync(projectModules)) {
  SCAN_DIRS.push(projectModules);
}

// 额外函数目录（仅 portal/site）
const projectFunctions = path.join(REPO_ROOT, 'apps', detectedProject, 'functions');
if (fs.existsSync(projectFunctions)) {
  SCAN_DIRS.push(projectFunctions);
}

const EXCLUDE_DIRS = ['node_modules', '.turbo', '__tests__', '__mocks__', '.next'];

// ─── 已知 false positive（静态键）─────────────────────────────────────
const LEGIT_SKIP = new Set([
  // API / HTTP related
  'Authorization', 'Cookie', 'T', 'id', 'limit', 'offset', 'script',
  // packages/ui locale keys (separate files)
  'about', 'address', 'backToTop', 'blog', 'contact', 'contactWhatsapp',
  'freeCheckHeader',
  'disclaimer', 'faq', 'freeCheck', 'hint', 'home', 'industries',
  'noResults', 'packages', 'placeholder', 'quickLinks', 'rights',
  'searching', 'sendEmail', 'services', 'whatsApp', 'logo',
  // Common category keys resolved at runtime
  'baby', 'electronics', 'fragrance', 'haircare', 'home_appliance',
  'it_equipment', 'lighting', 'makeup', 'medical', 'skincare',
  'sunscreen', 'toy', 'deodorant', 'oralcare', 'babycare', 'general',
  'suncare', 'confectionery', 'dairy', 'grain', 'health_food', 'honey',
  'meat', 'nuts', 'oil', 'other', 'seafood', 'canned', 'supplement',
  'spice', 'vegetable', 'beverages',
  // Pre-existing orphan
  'back',
]);

// ─── 已知 template false positive（t() 使用 namespace-aware 函数，
//      无法静态验证键的存在性）─────────────────────────────────────────
// 格式: Set<"filePathSuffix|exactTemplateString">
// filePathSuffix 是文件相对路径的尾部（endsWith 匹配）
// templateString 是模板字面量中两个反引号之间的内容
const EXCLUDED_TEMPLATE_PATTERNS = new Set([
  // === portal — Check / ReportSection / Home namespace (buildT / useT) ===
  'check/crossborder/check-client.tsx|catCb_${input["category"]}',
  'check/crossborder/check-client.tsx|catCb_${v}',
  'check/ccc/check-client.tsx|catCcc_${input["category"]}',
  'check/ccc/check-client.tsx|catCcc_${v}',
  'check/gacc/check-client.tsx|catGacc_${key}',
  'check/gacc/check-client.tsx|gaccCat_${input.category!}_label',
  'check/label/check-client.tsx|catLabel_${input["category"]}',
  'check/label/check-client.tsx|catLabel_${v}',
  'check/nmpa/check-client.tsx|catNmpa_${input["category"]}',
  'check/nmpa/check-client.tsx|catNmpa_${v}',
  'check/trademark/check-client.tsx|catTm_${input["category"]}',
  'check/trademark/check-client.tsx|catTm_${v}',
  'modules/ccc/rules.ts|cccCat_${cat}_label',
  'modules/gacc/rules.ts|gaccCat_${input.category}_label',
  'modules/gacc/rules.ts|gaccCat_${input.category}_riskReason',
  'modules/nmpa/rules.ts|nmpaCat_${cat}_label',
  'HorizonScan.tsx|impact_${h.impact}',
  'MandatoryElements.tsx|comp${prefix}',
  'MandatoryElements.tsx|comp${prefix}China',
  'MandatoryElements.tsx|comp${prefix}EU',
  'MandatoryElements.tsx|comp${prefix}US',
  'c/page.tsx|step${i}Title',
  'c/page.tsx|step${i}Desc',

  // === site — namespace-aware useTranslations / getTranslations ===
  'faq/page.tsx|${prefix}Title',
  'ServicesGrid.tsx|${s.key}PainPoint',
  'industries/page.tsx|industries.${ind.slug.replace(/-/g, \'\')}',
  'industries/page.tsx|industries.${ind.slug.replace(/-/g, \'\')}Desc',
  'IndustriesPreview.tsx|industry.${ind.slug.replace(/-/g, \'\')}',
  'FAQSection.tsx|learnMoreNames.${nameKey}',
  'ProcessSteps.tsx|processStep${i}Title',
  'ProcessSteps.tsx|processStep${i}Desc',
  'RelatedServiceCard.tsx|service_${service.serviceKey}',
  'WhyUsCards.tsx|whyCard${i}Title',
  'WhyUsCards.tsx|whyCard${i}Desc',
]);

function isExcludedTemplate(filePath, template) {
  for (const entry of EXCLUDED_TEMPLATE_PATTERNS) {
    const sepIdx = entry.indexOf('|');
    const suffix = entry.slice(0, sepIdx);
    const pattern = entry.slice(sepIdx + 1);
    if (filePath.endsWith(suffix) && template === pattern) return true;
  }
  return false;
}

// ─── 正则 ──────────────────────────────────────────────────────────────
// Static t("key") calls — supports dotted keys like Home.title
const T_CALL_RE = /t\(["']([a-zA-Z_][\w.]*)["'](?:\s*,|\))/g;

// Template-literal t(`...`) calls
const T_TEMPLATE_RE = /t\(`([^`]*)`(?:\s*,|\))/g;

// ─── Load en.json flat keys ──────────────────────────────────────────
function loadEnKeys() {
  if (!fs.existsSync(EN_JSON)) {
    console.error(`❌ 找不到英文源文件: ${EN_JSON}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(EN_JSON, 'utf-8');
  const en = JSON.parse(raw);

  const keys = new Set();
  const dotPaths = new Set();
  function collect(obj, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      const dotPath = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        collect(v, dotPath);
      } else {
        keys.add(k);
        dotPaths.add(dotPath);
      }
    }
  }
  collect(en);
  return { keys, dotPaths };
}

// ─── Filter non-translation template patterns ────────────────────────
function isNonTranslationTemplate(staticParts) {
  if (staticParts.length === 0) return true;

  const first = staticParts[0];

  // File paths
  if (first.includes('/') || first.includes('..')) return true;

  // String-building patterns
  if (/^[+\-☐]/.test(first)) return true;
  if (/^Report #/.test(first)) return true;

  // File references
  if (/\\.\w{2,4}$/.test(first)) return true;

  // Code expressions
  const fullStatic = staticParts.join('');
  if (fullStatic.startsWith('types.') ||
      fullStatic.startsWith('industriesDropdown.') ||
      fullStatic.startsWith('servicesDropdown.') ||
      fullStatic.endsWith('DropDown.') ||
      fullStatic === 'reports/') return true;

  return false;
}

// ─── Scan files ───────────────────────────────────────────────────────
function scanFiles() {
  const staticCalls = [];   // { key, file, line }
  const templateCalls = []; // { template, file, line, fallback }

  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;

    const walk = (d) => {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.includes(entry.name)) walk(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
        ) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relPath = path.relative(REPO_ROOT, fullPath);

            // Static t("key") calls
            let match;
            T_CALL_RE.lastIndex = 0;
            while ((match = T_CALL_RE.exec(content)) !== null) {
              const lineNum = content.substring(0, match.index).split('\n').length;
              staticCalls.push({ key: match[1], file: relPath, line: lineNum });
            }

            // Template literal t(`...`) calls
            T_TEMPLATE_RE.lastIndex = 0;
            while ((match = T_TEMPLATE_RE.exec(content)) !== null) {
              const lineNum = content.substring(0, match.index).split('\n').length;
              const template = match[1];

              const afterTemplate = content.substring(match.index + match[0].length).trim();
              const hasFallback = afterTemplate.startsWith(',');

              templateCalls.push({
                template,
                file: relPath,
                line: lineNum,
                fallback: hasFallback,
              });
            }
          } catch {
            // skip unreadable
          }
        }
      }
    };
    walk(dir);
  }

  return { staticCalls, templateCalls };
}

// ─── Parse template into segments ────────────────────────────────────
function parseTemplate(template) {
  const staticParts = [];
  const vars = [];
  let remaining = template;
  while (remaining.length > 0) {
    const dollarIdx = remaining.indexOf('${');
    if (dollarIdx === -1) {
      staticParts.push(remaining);
      break;
    }
    if (dollarIdx > 0) staticParts.push(remaining.substring(0, dollarIdx));
    const closeIdx = remaining.indexOf('}', dollarIdx);
    if (closeIdx === -1) {
      staticParts.push(remaining);
      break;
    }
    vars.push(remaining.substring(dollarIdx + 2, closeIdx).replace(/!+$/, '').trim());
    remaining = remaining.substring(closeIdx + 1);
  }
  return { staticParts, vars };
}

// ─── Main ─────────────────────────────────────────────────────────────
function main() {
  const enKeys = loadEnKeys();
  const { staticCalls, templateCalls } = scanFiles();

  let hasErrors = false;
  let excludedCount = 0;

  console.log(`\n🔑 t() 键存在性检查 — ${detectedProject.toUpperCase()}`);
  console.log(`   en.json: ${path.relative(REPO_ROOT, EN_JSON)}`);
  console.log(`   扫描目录: ${SCAN_DIRS.map(d => path.relative(REPO_ROOT, d)).join(', ')}\n`);

  // ═══════════════════════════════════════════════════════════════════
  // PART A: Static t("key") orphan check
  // ═══════════════════════════════════════════════════════════════════
  console.log('【A】静态 t("key") — orphan 键检查...\n');

  const keyRefs = {};
  for (const ref of staticCalls) {
    if (!keyRefs[ref.key]) keyRefs[ref.key] = [];
    keyRefs[ref.key].push(`${ref.file}:${ref.line}`);
  }

  const foundStatic = Object.keys(keyRefs).length;
  let orphans = 0;

  for (const [key, refs] of Object.entries(keyRefs).sort()) {
    if (LEGIT_SKIP.has(key)) continue;
    if (enKeys.dotPaths.has(key) || enKeys.keys.has(key)) continue;

    // Dynamic variable used as t() arg — check if prefix exists
    // e.g. t(category) where category = 'electronics'
    // We can't verify these statically, skip them
    if (/^[a-z]/.test(key)) {
      // Skip single lowercase words (likely variables, not literal keys)
      continue;
    }

    console.log(`  ❌ "${key}" not found in en.json`);
    for (const ref of refs.slice(0, 3)) {
      console.log(`       → ${ref}`);
    }
    if (refs.length > 3) {
      console.log(`       → ... and ${refs.length - 3} more references`);
    }
    orphans++;
    hasErrors = true;
  }

  console.log(`📊  ${foundStatic} unique static keys checked, ${orphans} orphan(s) found\n`);

  // ═══════════════════════════════════════════════════════════════════
  // PART B: Template literal t(`...`) key verification
  // ═══════════════════════════════════════════════════════════════════
  console.log('【B】动态 t(`…`) 模板键检查...\n');

  // Group by template pattern
  const templateGroups = {};
  for (const tpl of templateCalls) {
    const key = `${tpl.template}|fallback=${tpl.fallback}`;
    if (!templateGroups[key]) templateGroups[key] = [];
    templateGroups[key].push(tpl);
  }

  let totalPatterns = Object.keys(templateGroups).length;
  let templateIssues = 0;

  for (const [groupKey, refs] of Object.entries(templateGroups).sort()) {
    const tpl = refs[0];
    const template = tpl.template;
    const fallback = tpl.fallback;
    const filePath = refs[0].file;
    const locations = [...new Set(refs.map(r => `${r.file}:${r.line}`))];

    // 检查是否在排除列表中
    if (isExcludedTemplate(filePath, template)) {
      console.log(`  ⚠️  (excluded) \`${template}\` — 使用 namespace-aware t()`);
      excludedCount++;
      continue;
    }

    const parsed = parseTemplate(template);
    const { staticParts, vars } = parsed;

    // Single-var pattern: check prefix has matching keys in en.json
    if (vars.length === 1 && staticParts.length > 0 && !isNonTranslationTemplate(staticParts)) {
      const prefix = staticParts[0];
      const suffix = staticParts.length > 1 ? staticParts.slice(1).join('') : '';

      if (prefix && prefix.length > 1) {
        const matchingKeys = Array.from(enKeys.dotPaths).filter(k => k.startsWith(prefix));
        if (matchingKeys.length === 0) {
          const warn = fallback ? '⚠️  (has fallback)' : '❌ (NO fallback)';
          console.log(`  ${warn} \`${template}\` — prefix "${prefix}" has NO matching keys in en.json`);
          for (const loc of locations.slice(0, 3)) {
            console.log(`       → ${loc}`);
          }
          if (locations.length > 3) {
            console.log(`       → ... and ${locations.length - 3} more locations`);
          }
          if (!fallback) {
            templateIssues++;
            hasErrors = true;
          }
        } else {
          console.log(`  ✅ \`${template}\` — prefix "${prefix}" has ${matchingKeys.length} matching key(s)`);
        }
      }
    }
  }

  console.log(`\n📊  ${totalPatterns} template patterns checked, ${templateIssues} issue(s) found`);
  if (excludedCount > 0) {
    console.log(`   (${excludedCount} pattern(s) excluded as namespace-aware false positives)`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════
  const totalIssues = orphans + templateIssues;
  if (totalIssues > 0) {
    console.log(`\n⚠️  ${totalIssues} issue(s) found. Fix before deploying.\n`);
    if (isCi) process.exit(1);
    return;
  }

  console.log('\n✅ All keys verified — no issues found!\n');
  process.exit(0);
}

main();
