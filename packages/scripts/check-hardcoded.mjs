#!/usr/bin/env node
/**
 * Check for hardcoded English text in JSX/TSX/TS components.
 * 
 * Scans source files for JSX text children and attribute values that look like
 * English prose but aren't wrapped in a translation function (t(), getTranslations, etc.).
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
  'apps/blog/src',
  'packages/ui/src',
];

// ─── Patterns ──────────────────────────────────────────────────────────

// JSX text children: English prose inside <tag>text</tag> or <tag>text</
// Allows: "GACC Food Registration Check", "✅ Your product requires GACC"
// Catches: leading uppercase, 2+ words, may have emoji/✅ prefix, commas, parentheses
const ENGLISH_PROSE_RE = /[>\s](✅?\s*[A-Z][A-Za-z]*(?:[,.]?\s+[A-Za-z][a-zA-Z]*?){2,})[<,]/g;

// Attribute values: placeholder, aria-label, alt, title containing English
// Catches: placeholder="e.g., France"  label="HS Code (optional)"
const ENGLISH_ATTR_RE = /(placeholder|label|alt|title)\s*=\s*["']([A-Z][^"']{4,})["']/g;

// English prose inside JSX expressions like {loading ? 'Processing...' : 'Done'}
const ENGLISH_STRING_LITERAL_RE = /['"]([A-Z][a-zA-Z][^'"]{5,})['"]/g;

// Skip patterns
const SKIP_IMPORT_LIKE = /(import |from |require\(|interface |type |\.json['"]|messagesMap|\.ts['"])/;
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

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) return [];
  
  // Heuristic check for files that likely use a translation function
  const hasI18nImport = content.includes('useT(') || content.includes('useTranslations(') || 
                        content.includes('getTranslations(') || content.includes("from 'next-intl'") ||
                        content.includes('t(`') || content.includes("t('") || content.includes('t("');

  // Skip files without i18n imports unless they're UI components
  if (!hasI18nImport) return [];

  const lines = content.split('\n');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments, imports, type defs
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') ||
        line.includes('import ') || line.includes('interface ') || line.includes('type ') ||
        line.includes('from ') || line.includes('require(')) continue;

    // Skip lines that already use translation function
    if (SKIP_TRANSLATION_CALL.test(line)) continue;

    // ── Check 1: JSX prose children ────────────────────────────────
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

    // ── Check 2: Attribute values (placeholder/label/alt/title) ──
    ENGLISH_ATTR_RE.lastIndex = 0;
    while ((match = ENGLISH_ATTR_RE.exec(line)) !== null) {
      const attr = match[1];
      const val = match[2].trim();
      if (val.length < 5) continue;
      // Skip if it's already a t() call or template expression
      if (val.includes('{') || val.includes('}') || val.includes('$')) continue;
      if (LEGIT_ENGLISH.has(val)) continue;

      issues.push({ file: path.relative(repoRoot, filePath), line: lineNum, type: `attr ${attr}`, text: val.substring(0, 100) });
    }

    // ── Check 3: String literals in JSX expressions ─────────────────
    ENGLISH_STRING_LITERAL_RE.lastIndex = 0;
    while ((match = ENGLISH_STRING_LITERAL_RE.exec(line)) !== null) {
      const val = match[1].trim();
      if (val.length < 8) continue;
      if (LEGIT_ENGLISH.has(val)) continue;
      // Skip if preceded by t( or T(
      const before = line.substring(0, match.index);
      if (/[tT]\s*\(\s*['"]$/.test(before)) continue;

      issues.push({ file: path.relative(repoRoot, filePath), line: lineNum, type: 'string literal', text: val.substring(0, 100) });
    }
  }
  
  return issues;
}

function scanDir(dirPath) {
  const absPath = path.resolve(dirPath);
  if (!fs.existsSync(absPath)) return [];
  
  let allIssues = [];
  const entries = fs.readdirSync(absPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(absPath, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      allIssues = allIssues.concat(scanDir(fullPath));
    } else if (entry.isFile() && /\.(tsx|jsx|ts)$/.test(entry.name)) {
      allIssues = allIssues.concat(scanFile(fullPath));
    }
  }
  
  return allIssues;
}

// Main
const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const fixMode = args.includes('--fix');
const customDir = args.find(a => !a.startsWith('--'));

const dirs = customDir ? [customDir] : DIRS_TO_CHECK.map(d => path.join(repoRoot, d));

console.log('🔍 Scanning for hardcoded English text in JSX/TSX...\n');

let totalIssues = 0;
for (const dir of dirs) {
  const relDir = path.relative(repoRoot, dir);
  const issues = scanDir(dir);
  if (issues.length > 0) {
    console.log(`  ${relDir}:`);
    for (const issue of issues) {
      console.log(`    📄 ${issue.file}:${issue.line} [${issue.type}] → "${issue.text}"`);
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
