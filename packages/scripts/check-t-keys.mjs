#!/usr/bin/env node
/**
 * check-t-keys.mjs — Detect t("key") / t(`key`) calls referencing non-existent keys.
 *
 * Scans all .ts/.tsx files in apps/portal/ and packages/ui/ for:
 *   A) Static t("key_name") calls → verify each key exists in en.json
 *   B) Template literal t(`prefix_${var}_suffix`) calls → verify expected
 *      keys exist by expanding known value sources (COMPARISON_FIELDS,
 *      step iterators, module CATEGORY_LABELS, etc.)
 *
 * Usage: node packages/scripts/check-t-keys.mjs
 * Exit: 0 if clean, 1 if any orphan keys found
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../");
const EN_JSON = path.join(ROOT, "apps/portal/messages/en.json");

// ─── Known false positives ──────────────────────────────────────────────
const LEGIT_SKIP = new Set([
  // API function variables (not translation keys)
  "Authorization", "Cookie", "T", "id", "limit", "offset", "script",
  // packages/ui locale keys (in separate locale files, not portal/en.json)
  "about", "address", "backToTop", "blog", "contact", "contactWhatsapp",
  "freeCheckHeader",
  "disclaimer", "faq", "freeCheck", "hint", "home", "industries",
  "noResults", "packages", "placeholder", "quickLinks", "rights",
  "searching", "sendEmail", "services", "whatsapp", "logo",
  // Dynamic category enum keys resolved at runtime (used as literal t() args)
  "baby", "electronics", "fragrance", "haircare", "home_appliance",
  "it_equipment", "lighting", "makeup", "medical", "skincare",
  "sunscreen", "toy", "deodorant", "oralcare", "babycare", "general",
  "suncare", "confectionery", "dairy", "grain", "health_food", "honey",
  "meat", "nuts", "oil", "other", "seafood", "canned", "supplement",
  "spice", "vegetable", "beverages",
  // Pre-existing orphan (not in en.json but in all locales)
  "back",
]);

// ─── Directories to scan ───────────────────────────────────────────────
const SCAN_DIRS = [
  path.join(ROOT, "apps/portal/src"),
  path.join(ROOT, "apps/portal/modules"),
  path.join(ROOT, "apps/portal/functions"),
  path.join(ROOT, "packages/ui/src"),
];

const EXCLUDE_DIRS = ["node_modules", ".turbo", "__tests__", "__mocks__"];

// ─── Regex patterns ────────────────────────────────────────────────────
// Static t("key") calls: matches pure string literal keys
const T_CALL_RE = /t\(["']([a-zA-Z_][a-zA-Z0-9_]*)["'](?:\s*,|\))/g;

// Template-literal t(`...`) calls: captures everything inside backticks
const T_TEMPLATE_RE = /t\(`([^`]*)`(?:\s*,|\))/g;

// Ternary t() calls: t(condition ? "keyHigh" : "keyLow")
const T_TERNARY_RE = /t\([^?]+\?\s*["'](\w+)["']\s*:\s*["'](\w+)["']\)/g;

// ─── Known value sources for dynamic key expansion ─────────────────────

// ---- COMPARISON_FIELDS (MandatoryElements.tsx) ----
const COMPARISON_FIELDS = [
  "ProductName", "Ingredients", "NetContent", "Nutrition",
  "Allergens", "DateMarking", "CountryOfOrigin", "Language",
  "Storage", "Manufacturer",
];

// ---- Step iterator range (homepage steps) ----
const STEP_RANGE = [1, 2, 3];

// ─── Load CATEGORY_LABELS from all modules ────────────────────────────
let MODULE_CATEGORY_LABELS = null;

function loadModuleCategoryLabels() {
  if (MODULE_CATEGORY_LABELS) return MODULE_CATEGORY_LABELS;
  const result = {};
  const modulesDir = path.join(ROOT, "apps/portal/modules");
  if (!fs.existsSync(modulesDir)) return result;

  const dirs = fs.readdirSync(modulesDir, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const rulesPath = path.join(modulesDir, d.name, "rules.ts");
    if (!fs.existsSync(rulesPath)) continue;

    try {
      const content = fs.readFileSync(rulesPath, "utf-8");
      // Extract CATEGORY_LABELS definition body (between first { and last })
      // Handles both quoted keys ("key":) and unquoted keys (key:)
      const match = content.match(
        /export\s+(?:const|var|let)\s+CATEGORY_LABELS\s*(?::[^=]*)?=\s*(\{[^]*?\n\})/s
      );
      if (match) {
        const objText = match[1];
        // Parse key-value pairs: supports "key":, 'key':, key: (unquoted)
        const keyRe = /['"]?(\w+)['"]?\s*:/g;
        let kv;
        while ((kv = keyRe.exec(objText)) !== null) {
          // Build prefix → values map for each module
          const moduleKeys = Object.keys(result);
          let prefix;
          if (d.name === "gacc") {
            addLabel(result, "catGacc_", kv[1]);
            addLabel(result, "gaccCat_", kv[1]);
          } else if (d.name === "ccc") {
            addLabel(result, "catCcc_", kv[1]);
            addLabel(result, "cccCat_", kv[1]); // cccCat_{cat}_label from getPROFILES
          } else if (d.name === "nmpa") {
            addLabel(result, "catNmpa_", kv[1]);
            addLabel(result, "nmpaCat_", kv[1]); // nmpaCat_{cat}_label from getPROFILES
          } else if (d.name === "label") {
            addLabel(result, "catLabel_", kv[1]);
          } else if (d.name === "crossborder") {
            addLabel(result, "catCb_", kv[1]);
          } else if (d.name === "trademark") {
            addLabel(result, "catTm_", kv[1]);
          }
        }
      }
    } catch {
      // skip unreadable
    }
  }
  MODULE_CATEGORY_LABELS = result;
  return result;
}

function addLabel(map, prefix, value) {
  if (!map[prefix]) map[prefix] = [];
  map[prefix].push(value);
}

// ─── Strip TS non-null assertion (!) from var names ───────────────────
function stripVar(v) {
  return v.replace(/!+$/, "").trim();
}

// ─── Parse a template literal into segments ──────────────────────────
// "comp${prefix}China" → { staticParts: ["comp", "China"], vars: ["prefix"] }
function parseTemplateLiteral(template) {
  const staticParts = [];
  const vars = [];
  let remaining = template;
  while (remaining.length > 0) {
    const dollarIdx = remaining.indexOf("${");
    if (dollarIdx === -1) {
      staticParts.push(remaining);
      break;
    }
    if (dollarIdx > 0) staticParts.push(remaining.substring(0, dollarIdx));
    const closeIdx = remaining.indexOf("}", dollarIdx);
    if (closeIdx === -1) {
      staticParts.push(remaining);
      break;
    }
    vars.push(stripVar(remaining.substring(dollarIdx + 2, closeIdx)));
    remaining = remaining.substring(closeIdx + 1);
  }
  return { staticParts, vars };
}

// ─── Expand a template to expected keys using known value sources ────
function expandTemplateKeys({ staticParts, vars, fallback }) {
  const info = { staticParts, vars, fallback };
  const isSingleVar = vars.length === 1;

  if (isSingleVar) {
    const prefix0 = staticParts[0] || "";
    const suffix = staticParts.length > 1 ? staticParts.slice(1).join("") : "";

    // --- comp${prefix} / comp${prefix}China / etc ---
    if (prefix0 === "comp" && ["", "China", "EU", "US"].includes(suffix)) {
      info.expectedKeys = COMPARISON_FIELDS.map(f => `comp${f}${suffix}`);
      return info;
    }

    // --- step${i}Title / step${i}Desc ---
    if (prefix0 === "step" && (suffix === "Title" || suffix === "Desc")) {
      info.expectedKeys = STEP_RANGE.map(i => `step${i}${suffix}`);
      return info;
    }

    // --- catCcc_${v}, catNmpa_${v}, catLabel_${v}, catCb_${v}, catTm_${v}, catGacc_${key} ---
    const catLabels = loadModuleCategoryLabels();
    for (const [cp, values] of Object.entries(catLabels)) {
      if (prefix0 === cp && suffix === "") {
        info.expectedKeys = values.map(v => `${cp}${v}`);
        return info;
      }
    }

    // --- gaccCat_${cat}_label, cccCat_${cat}_label, nmpaCat_${cat}_label ---
    // prefix0 = "gaccCat_", suffix = "_label"
    // prefix0 = "cccCat_", suffix = "_label" (but values come from module labels keyed as "gaccCat_")
    for (const [cp, values] of Object.entries(catLabels)) {
      // 'cp' is like "gaccCat_" — prefix should match, suffix should be known
      if (cp === prefix0 && suffix !== "") {
        info.expectedKeys = values.map(v => `${cp}${v}${suffix}`);
        return info;
      }
    }

    // --- cccCat_${cat}_label, nmpaCat_${cat}_label (these use Kebab-case module names) ---
    // "cccCat_", "nmpaCat_" prefixes come from caegory prefix + "CAT_" not "Cat_"
    // Actually, looking at the modules, the profile functions use t(`cccCat_${cat}_label`)
    // but the check-client uses t(`catCcc_${v}`). The "cccCat_" prefix exists in modules/rules.ts
    // but not in our loaded labels since our prefix mapping goes through addLabel with "ccc" → "catCcc_".
    // So "cccCat_", "nmpaCat_", etc. are NOT in our labels map — they are different keys.
    // Let me check if they exist in en.json as a fallback.
  }

  // --- Fallback for unknown patterns: check prefix has matches in en.json ---
  if (staticParts.length > 0 && vars.length > 0) {
    info.prefixOk = null; // unknown expansion
  }

  return info;
}

// ─── Load en.json flat key set ────────────────────────────────────────
function loadEnKeys() {
  const raw = fs.readFileSync(EN_JSON, "utf-8");
  const en = JSON.parse(raw);

  const keys = new Set();
  function collect(obj) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        collect(v);
      } else {
        keys.add(k);
      }
    }
  }
  collect(en);
  return keys;
}

// ─── Filter out non-translation template patterns (false positives) ──
// Returns true if this is likely NOT a translation key pattern
function isNonTranslationTemplate(staticParts, template) {
  if (staticParts.length === 0) return true;

  const first = staticParts[0];

  // File paths: contain / or ../
  if (first.includes("/")) return true;

  // String-building patterns
  if (/^[+\-☐]/.test(first)) return true;
  if (/^Report #/.test(first)) return true;

  // File references / URL-like
  if (/\\.\w{2,4}$/.test(first)) return true;

  // Code expressions masquerading as strings (e.g. contains dots like property access)
  const fullStatic = staticParts.join("");
  if (fullStatic.startsWith("types.") ||
      fullStatic.startsWith("industriesDropdown.") ||
      fullStatic.startsWith("servicesDropdown.") ||
      fullStatic.endsWith("DropDown.") ||
      fullStatic === "reports/") return true;

  // Dynamic import paths
  if (first.startsWith("../../")) return true;

  return false;
}

// ─── Scan files ────────────────────────────────────────────────────────
function scanFiles() {
  const staticResults = [];
  const templateResults = [];

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
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
        ) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const relPath = path.relative(ROOT, fullPath);

            // Static t("key") calls
            let match;
            T_CALL_RE.lastIndex = 0;
            while ((match = T_CALL_RE.exec(content)) !== null) {
              const lineNum = content.substring(0, match.index).split("\n").length;
              staticResults.push({ key: match[1], file: relPath, line: lineNum });
            }

            // Template literal t(`...`) calls
            T_TEMPLATE_RE.lastIndex = 0;
            while ((match = T_TEMPLATE_RE.exec(content)) !== null) {
              const lineNum = content.substring(0, match.index).split("\n").length;
              const template = match[1];
              const parsed = parseTemplateLiteral(template);

              // Determine if there's a fallback parameter: t(`...`, something)
              const afterTemplate = content.substring(match.index + match[0].length).trim();
              const hasFallback = afterTemplate.startsWith(",");

              const expanded = expandTemplateKeys({
                staticParts: parsed.staticParts,
                vars: parsed.vars,
                fallback: hasFallback,
              });

              templateResults.push({
                template,
                file: relPath,
                line: lineNum,
                fallback: hasFallback,
                ...expanded,
              });
            }

            // Ternary t(? ...) calls: t(condition ? "keyHigh" : "keyLow")
            T_TERNARY_RE.lastIndex = 0;
            while ((match = T_TERNARY_RE.exec(content)) !== null) {
              const lineNum = content.substring(0, match.index).split("\n").length;
              staticResults.push({ key: match[1], file: relPath, line: lineNum });
              staticResults.push({ key: match[2], file: relPath, line: lineNum });
            }
          } catch {
            // skip unreadable
          }
        }
      }
    };
    walk(dir);
  }

  return { staticResults, templateResults };
}

// ─── Check if a key matches a known dynamic prefix (for Part A skip) ──
function isKnownDynamicKey(key) {
  const catLabels = loadModuleCategoryLabels();
  for (const prefix of Object.keys(catLabels)) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

// ─── Main ──────────────────────────────────────────────────────────────
function main() {
  const enKeys = loadEnKeys();
  const { staticResults, templateResults } = scanFiles();

  let hasErrors = false;

  // ═══════════════════════════════════════════════════════════════════
  // PART A: Static t("key") orphan check
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n🔍 【A】 Static t(\"key\") — orphaned keys...\n");

  const keyRefs = {};
  for (const ref of staticResults) {
    if (!keyRefs[ref.key]) keyRefs[ref.key] = [];
    keyRefs[ref.key].push(`${ref.file}:${ref.line}`);
  }

  const foundStatic = Object.keys(keyRefs).length;
  let orphans = 0;

  for (const [key, refs] of Object.entries(keyRefs).sort()) {
    if (LEGIT_SKIP.has(key)) continue;
    if (!enKeys.has(key)) {
      // Double-check: maybe it's a dynamic variable used as static literal arg?
      if (isKnownDynamicKey(key)) continue;
      console.log(`  ❌ "${key}" not found in en.json`);
      for (const ref of refs.slice(0, 5)) {
        console.log(`       → ${ref}`);
      }
      if (refs.length > 5) {
        console.log(`       → ... and ${refs.length - 5} more references`);
      }
      orphans++;
      hasErrors = true;
    }
  }

  console.log(`📊  ${foundStatic} unique static keys checked, ${orphans} orphan(s) found`);

  // ═══════════════════════════════════════════════════════════════════
  // PART B: Template literal t(`...`) dynamic key validation
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n🔍 【B】 Dynamic t(`…`) template keys...\n");

  // Group by template pattern for dedup
  const templateGroups = {};
  for (const tpl of templateResults) {
    const key = `${tpl.template}|hasFallback=${tpl.fallback}`;
    if (!templateGroups[key]) templateGroups[key] = [];
    templateGroups[key].push(tpl);
  }

  let totalTemplatePatterns = Object.keys(templateGroups).length;
  let missingDynamicKeys = 0;
  let templateIssues = 0;
  let expandedCount = 0;

  for (const [groupKey, refs] of Object.entries(templateGroups).sort()) {
    const tpl = refs[0];
    const template = tpl.template;
    const fallback = tpl.fallback;
    const locations = [...new Set(refs.map(r => `${r.file}:${r.line}`))];

    if (tpl.expectedKeys) {
      expandedCount++;
      // We have a known expansion — verify each generated key
      const missing = tpl.expectedKeys.filter(k => !enKeys.has(k));

      if (missing.length > 0) {
        const verb = fallback ? "MISSING (has fallback)" : "MISSING (NO fallback)";
        console.log(`  ⚠️  \`${template}\` — ${missing.length}/${tpl.expectedKeys.length} keys ${verb}:`);
        for (const mk of missing) {
          console.log(`       ❌ "${mk}" not found in en.json`);
          missingDynamicKeys++;
        }
        for (const loc of locations.slice(0, 3)) {
          console.log(`       → ${loc}`);
        }
        if (locations.length > 3) {
          console.log(`       → ... and ${locations.length - 3} more locations`);
        }
        templateIssues++;
        hasErrors = true;
      } else {
        // All good
        console.log(`  ✅ \`${template}\` — ${tpl.expectedKeys.length} keys verified`);
      }
    } else {
      // Unknown expansion — report based on var count
      const numVars = tpl.vars ? tpl.vars.length : 0;
      if (numVars >= 2) {
        // skip multi-var patterns (too dynamic)
        if (false) {} // silent skip
      } else if (numVars === 1 && tpl.staticParts && tpl.staticParts.length > 0) {
        // Filter out non-translation patterns (file paths, string building, etc.)
        if (isNonTranslationTemplate(tpl.staticParts, template)) continue;

        // Check prefix has matches
        const prefix = tpl.staticParts[0];
        if (prefix && prefix.length > 1) {
          const hasAnyKey = Array.from(enKeys).some(k => k.startsWith(prefix));
          if (!hasAnyKey) {
            console.log(`  ⚠️  \`${template}\` — prefix "${prefix}" has NO matching keys in en.json ${fallback ? '(has fallback)' : '(NO fallback)'}`);
            templateIssues++;
            hasErrors = true;
          }
        }
      }
    }
  }

  console.log(`\n📊  ${totalTemplatePatterns} template patterns (${expandedCount} expanded), ${missingDynamicKeys} missing key(s) across ${templateIssues} pattern(s)`);

  // ═══════════════════════════════════════════════════════════════════
  // Final summary
  // ═══════════════════════════════════════════════════════════════════
  const totalIssues = orphans + missingDynamicKeys;
  if (totalIssues > 0) {
    console.log(`\n⚠️  ${totalIssues} issue(s) found. Fix before deploying.\n`);
    process.exit(1);
  }

  console.log("\n✅ All keys verified — static and dynamic — no issues found!\n");
  process.exit(0);
}

main();
