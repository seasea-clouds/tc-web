#!/usr/bin/env node
/**
 * Merge translated keys from translate-tool output into per-locale portal messages.
 * Usage: node merge-translations.mjs <results-json> <messages-dir>
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const resultsFile = process.argv[2] || '/tmp/portal-ci-50keys-results.json';
const messagesDir = process.argv[3] || '/root/projects/trade/web/apps/portal/messages';

const results = JSON.parse(readFileSync(resultsFile, 'utf-8'));
const translations = results.results;

// Get all locale files in the messages dir
const files = readdirSync(messagesDir).filter(f => f.endsWith('.json'));

let mergedCount = 0;

for (const file of files) {
  const locale = file.replace('.json', '');
  const filePath = join(messagesDir, file);
  const messages = JSON.parse(readFileSync(filePath, 'utf-8'));

  // Ensure "Check" namespace exists
  if (!messages.Check) messages.Check = {};

  // Check if we have translations for this locale
  if (translations[locale]) {
    const localeTranslations = translations[locale];
    for (const [key, value] of Object.entries(localeTranslations)) {
      // Strip namespace prefix (e.g. 'Check.cbDimension_x' -> 'cbDimension_x')
      const cleanKey = key.replace(/^[A-Z][a-z]+\./, '');
      const ns = key.includes('.') ? key.split('.')[0] : 'Check';
      if (!messages[ns]) messages[ns] = {};
      if (!messages[ns][cleanKey]) {
        messages[ns][cleanKey] = value;
        mergedCount++;
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(messages, null, 2) + '\n', 'utf-8');
}

console.log(`✅ Merged ${mergedCount} new translation keys into ${files.length} locale files`);
