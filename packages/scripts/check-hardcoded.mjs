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
  'SinoTrade Compliance', 'GACC', 'NMPA', 'CCC', 'CBEC', 'CIFER',
  'Free Check', 'Free Assessment', 'Home', 'Services', 'About', 'Contact',
  'Packages', 'Blog', 'FAQ', 'WhatsApp', 'WeChat', 'Sign In', 'Sign Up',
  'Sign Out', 'Next Steps', 'Get a Quote', 'Select category', 'Select',
  'Yes', 'No', 'Other', 'None', 'In Progress', 'Loading', 'Products',
  'Not', 'GACC Food Registration', 'Chinese Label Compliance',
  'CCC Certification', 'Cosmetics Filing', 'NMPA Cosmetics Filing',
  'Cross-border E-commerce', 'Brand Protection', 'Compliance Self-Check',
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
  if (!hasI18nImport) return dataLabelIssues;

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
