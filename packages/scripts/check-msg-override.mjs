/**
 * CI-3: Cross-app message override detection.
 *
 * Detects when an app-level message file (apps/*/messages/{locale}.json)
 * overrides a key that already exists in the shared UI package
 * (packages/ui/messages/) with an English value, while the UI package
 * had a proper translation.
 *
 * This prevents regressions like P0-1 where Blog messages had
 * Navbar.blog = "Blog" overriding the UI package's translated values.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const UI_MSG_DIR = join(REPO_ROOT, 'packages', 'ui', 'messages');
const APPS = {
  portal: join(REPO_ROOT, 'apps', 'portal', 'messages'),
  site: join(REPO_ROOT, 'apps', 'site', 'messages'),
  blog: join(REPO_ROOT, 'apps', 'blog', 'messages'),
};

// Deep flatten: { ns: { key: val } } => { "ns.key": val }
function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, fullKey));
    } else {
      result[fullKey] = v;
    }
  }
  return result;
}

function loadJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

// Load UI English as the canonical reference
const uiEn = loadJSON(join(UI_MSG_DIR, 'en.json'));
if (!uiEn) {
  console.error('❌ Cannot find UI en.json at', join(UI_MSG_DIR, 'en.json'));
  process.exit(1);
}
const uiEnFlat = flatten(uiEn);

// Get UI locales
const uiFiles = readdirSync(UI_MSG_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');
const uiLocales = uiFiles.map(f => f.replace('.json', ''));

let totalIssues = 0;

for (const [appName, appDir] of Object.entries(APPS)) {
  if (!existsSync(appDir)) continue;

  for (const locale of uiLocales) {
    const uiFilePath = join(UI_MSG_DIR, `${locale}.json`);
    const appFilePath = join(appDir, `${locale}.json`);

    if (!existsSync(uiFilePath) || !existsSync(appFilePath)) continue;

    const uiLocaleData = loadJSON(uiFilePath);
    const appLocaleData = loadJSON(appFilePath);
    if (!uiLocaleData || !appLocaleData) continue;

    const uiFlat = flatten(uiLocaleData);
    const appFlat = flatten(appLocaleData);

    for (const [key, appVal] of Object.entries(appFlat)) {
      // Only check keys that exist in BOTH UI and app
      if (uiFlat[key] === undefined) continue;

      const uiVal = uiFlat[key];
      const enVal = uiEnFlat[key];

      // If UI already translates it differently from English,
      // but the app overrides it back to English, flag it.
      if (uiVal !== enVal && appVal === enVal) {
        console.log(`⚠️  ${appName}/${locale}.json: "${key}" = "${appVal}" (UI has: "${uiVal}")`);
        totalIssues++;
      }
    }
  }
}

if (totalIssues === 0) {
  console.log('✅ CI-3: No cross-app message overrides detected');
} else {
  console.log(`\n❌ CI-3: ${totalIssues} override(s) found (app key = English, UI key = translated)`);
}
process.exit(totalIssues > 0 ? 1 : 0);
