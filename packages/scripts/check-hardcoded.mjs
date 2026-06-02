#!/usr/bin/env node
/**
 * Check for hardcoded English text in JSX components.
 * 
 * Scans source files for JSX text children that look like English prose
 * but aren't wrapped in a translation function (t(), getTranslations, etc.).
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

// Patterns that look like English prose: starts with uppercase, more than 2 words
// This catches things like: <Button>Check My Product</Button>
const ENGLISH_PROSE_RE = /[>\s]([A-Z][a-z]+(?:\s+[a-z]+){2,})[<,]/g;

// Skip patterns — these are legitimate
const SKIP_TAGS = /<[A-Z][a-z]*\s/;  // JSX tags themselves
const SKIP_ATTRS = /(placeholder|aria-label|alt|title)\s*=\s*["']/;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) return [];
  
  // Heuristic check for files that likely use a translation function
  const hasI18nImport = content.includes('useT(') || content.includes('useTranslations(') || 
                        content.includes('getTranslations(') || content.includes("from 'next-intl'") ||
                        content.includes('t(`') || content.includes("t('") || content.includes('t("');

  // If the file already uses translations, scan for untranslated strings
  if (!hasI18nImport) return [];  // skip files that don't do i18n at all

  const lines = content.split('\n');
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Skip comment lines, import lines, and type definitions
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || 
        line.trim().startsWith('*') || line.includes('import ') ||
        line.includes('interface ') || line.includes('type ') || line.includes(': ') ||
        line.includes('from ') || line.includes('require(')) continue;
    
    // Skip attribute-only lines
    if (SKIP_ATTRS.test(line)) continue;
    
    // Check for English prose patterns
    let match;
    while ((match = ENGLISH_PROSE_RE.exec(line)) !== null) {
      const text = match[1].trim();
      
      // Skip known false positives
      if (text.length < 10) continue;  // too short to be English prose
      if (/^[A-Z][a-z]+$/.test(text)) continue;  // single word
      if (/^\d/.test(text)) continue;  // starts with number
      if (/[<>{}()]/.test(text)) continue;  // JSX syntax interspersed
      if (text === text.toLowerCase()) continue;  // all lowercase
      if (text.includes('{') || text.includes('}')) continue;  // contains JSX expression
      
      // Skip if it looks like a translation key reference
      if (text.includes('.') || text.includes('_') || text === text.toUpperCase()) continue;
      
      // Check if this text is likely using t() function
      if (line.includes(`>${text}<`)) {
        issues.push({
          file: path.relative(repoRoot, filePath),
          line: lineNum,
          text: text.trim().substring(0, 80),
        });
      }
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
    } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
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

console.log('🔍 Scanning for hardcoded English text in JSX...\n');

let totalIssues = 0;
for (const dir of dirs) {
  const relDir = path.relative(repoRoot, dir);
  const issues = scanDir(dir);
  if (issues.length > 0) {
    console.log(`  ${relDir}:`);
    for (const issue of issues) {
      console.log(`    📄 ${issue.file}:${issue.line} → "${issue.text}"`);
      totalIssues++;
    }
  }
}

if (totalIssues === 0) {
  console.log('✅ No hardcoded English text found.');
  process.exit(0);
} else {
  console.log(`\n⚠️  Found ${totalIssues} potential hardcoded English strings.`);
  console.log('   If these are legitimate, ignore or add them to skip list.');
  if (isCI) process.exit(1);
}
