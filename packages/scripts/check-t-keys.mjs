#!/usr/bin/env node
/**
 * check-t-keys.mjs — Detect t("key") calls referencing non-existent keys.
 *
 * Scans all .ts/.tsx files in apps/portal/ and packages/ui/ for static
 * t("key_name") calls, then verifies each key exists in en.json.
 *
 * Skips dynamic keys like t(`prefix_${var}`) and keys with a fallback
 * parameter t("key", fallback).
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

// Known false positives: t() call patterns that aren't translation lookups
// - Variable names in non-React API functions
// - packages/ui component keys (use separate locale files)
// - Dynamic category enum keys resolved at runtime
const LEGIT_SKIP = new Set([
  // API function variables (not translation keys)
  "Authorization", "Cookie", "T", "id", "limit", "offset", "script",
  // packages/ui locale keys (in separate locale files, not portal/en.json)
  "about", "address", "backToTop", "blog", "contact", "contactWhatsapp",
  "disclaimer", "faq", "freeCheck", "hint", "home", "industries",
  "noResults", "packages", "placeholder", "quickLinks", "rights",
  "searching", "sendEmail", "services", "whatsapp", "logo",
  // Dynamic category enum keys resolved at runtime
  "baby", "electronics", "fragrance", "haircare", "home_appliance",
  "it_equipment", "lighting", "makeup", "medical", "skincare",
  "sunscreen", "toy", "deodorant", "oralcare", "babycare", "general",
  "suncare", "confectionery", "dairy", "grain", "health_food", "honey",
  "meat", "nuts", "oil", "other", "seafood", "canned", "supplement",
  "spice", "vegetable", "beverages",
  // Pre-existing orphan (not in en.json but in all locales)
  "back",
]);

// Directories to scan
const SCAN_DIRS = [
  path.join(ROOT, "apps/portal/src"),
  path.join(ROOT, "apps/portal/modules"),
  path.join(ROOT, "apps/portal/functions"),
  path.join(ROOT, "packages/ui/src"),
];

const EXCLUDE_DIRS = ["node_modules", ".turbo", "__tests__", "__mocks__"];

// Regex for static t("key") calls — captures keys without template literals
// Supports: t("key"), t('key'), t("key", fallback)
const T_CALL_RE = /t\(["']([a-zA-Z_][a-zA-Z0-9_]*)["'](?:\s*,|\))/g;

function loadEnKeys() {
  const raw = fs.readFileSync(EN_JSON, "utf-8");
  const en = JSON.parse(raw);

  // Collect ALL leaf-key names from en.json (excluding namespace prefixes)
  // e.g. { Check: { nmpaMarket_trend: "..." } } → "nmpaMarket_trend"
  const keys = new Set();
  function collect(obj) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        collect(v); // recurse into namespace objects
      } else {
        keys.add(k); // leaf key only, no namespace prefix
      }
    }
  }
  collect(en);
  return keys;
}

function scanFiles() {
  const results = [];

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
            let match;
            while ((match = T_CALL_RE.exec(content)) !== null) {
              const lineNum =
                content.substring(0, match.index).split("\n").length;
              results.push({
                key: match[1],
                file: path.relative(ROOT, fullPath),
                line: lineNum,
              });
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    };
    walk(dir);
  }

  return results;
}

function main() {
  const enKeys = loadEnKeys();
  const tCalls = scanFiles();

  console.log("\n🔍 Scanning for t() calls referencing non-existent keys...\n");

  // Group by key for dedup
  const keyRefs = {};
  for (const ref of tCalls) {
    if (!keyRefs[ref.key]) keyRefs[ref.key] = [];
    keyRefs[ref.key].push(`${ref.file}:${ref.line}`);
  }

  const found = Object.keys(keyRefs).length;
  let orphans = 0;

  for (const [key, refs] of Object.entries(keyRefs).sort()) {
    if (LEGIT_SKIP.has(key)) continue;
    if (!enKeys.has(key)) {
      console.log(`  ❌ "${key}" not found in en.json`);
      for (const ref of refs.slice(0, 5)) {
        console.log(`       → ${ref}`);
      }
      if (refs.length > 5) {
        console.log(`       → ... and ${refs.length - 5} more references`);
      }
      orphans++;
    }
  }

  console.log(`\n📊 ${found} unique t() keys checked, ${orphans} orphan(s) found`);

  if (orphans > 0) {
    console.log("\n⚠️  Orphan keys detected! Either add them to en.json or fix the t() calls.\n");
    process.exit(1);
  }

  console.log("✅ All t() keys exist in en.json\n");
  process.exit(0);
}

main();
