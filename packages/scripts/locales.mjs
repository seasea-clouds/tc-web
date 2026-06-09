/**
 * Shared locale list for build scripts (Node.js .mjs).
 * Single source of truth: packages/ui/locales.json
 * Update that file when adding/removing languages — both TypeScript and scripts consume it.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesJsonPath = path.resolve(__dirname, '../../packages/ui/locales.json');

export const LOCALES = JSON.parse(fs.readFileSync(localesJsonPath, 'utf-8'));
