#!/usr/bin/env node
/**
 * check-override-keys.mjs — 跨 App 消息覆盖检测
 *
 * 检测 app 层 messages 是否覆盖了 UI 包 (packages/ui/messages) 的同名键。
 * 当 App 定义了一个与 UI 包同名的 key，运行时会覆盖 UI 包的翻译。
 *
 * ⚠️ Severity 分级:
 *   🔴 CRITICAL — 覆盖值与英文源 (en.json) 完全一致 ⇒ 肯定是忘了翻译
 *   🟡 WARNING  — 覆盖值与 UI 包值不同（可能是故意或翻译质量差异）
 *   ℹ️ INFO     — 覆盖值与 UI 包值完全相同（冗余键，可删除）
 *
 * 用法：
 *   node packages/scripts/check-override-keys.mjs
 *   node packages/scripts/check-override-keys.mjs --ci   # CRITICAL 时 exit 1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const isCi = process.argv.includes('--ci');

const UI_MSG_DIR = path.join(repoRoot, 'packages/ui/messages');

const APP_MSG_DIRS = [
  { name: 'site', dir: path.join(repoRoot, 'apps/site/messages') },
  { name: 'portal', dir: path.join(repoRoot, 'apps/portal/messages') },
  { name: 'blog', dir: path.join(repoRoot, 'apps/blog/messages') },
];

// ─── 辅助函数 ──────────────────────────────────────────────────────────

function getLocales() {
  return fs.readdirSync(UI_MSG_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

function flattenKeys(data, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

/** 加载 app 的 en.json 作为英文源 */
function loadEnSource(appDir) {
  const enPath = path.join(appDir, 'en.json');
  try {
    return flattenKeys(JSON.parse(fs.readFileSync(enPath, 'utf-8')));
  } catch { return null; }
}

/** 判断字符串是否为纯 ASCII 文本（不含非英文字符） */
function isAsciiText(str) {
  if (!str || /[^\x00-\x7F]/.test(str)) return false;
  return /[A-Za-z]/.test(str);
}

// ─── 主逻辑 ────────────────────────────────────────────────────────────

function run() {
  const locales = getLocales();
  const allIssues = [];

  for (const { name: appName, dir: appDir } of APP_MSG_DIRS) {
    if (!fs.existsSync(appDir)) continue;

    const enSource = loadEnSource(appDir);

    for (const locale of locales) {
      if (locale === 'en') continue;

      const appPath = path.join(appDir, `${locale}.json`);
      const uiPath = path.join(UI_MSG_DIR, `${locale}.json`);
      if (!fs.existsSync(appPath) || !fs.existsSync(uiPath)) continue;

      const appData = readJson(appPath);
      const uiData = readJson(uiPath);
      if (!appData || !uiData) continue;

      const appKeys = flattenKeys(appData);
      const uiKeys = flattenKeys(uiData);

      for (const [key, appVal] of Object.entries(appKeys)) {
        if (!(key in uiKeys)) continue;
        const uiVal = uiKeys[key];

        if (appVal === uiVal) {
          // 值完全一致 — INFO
          allIssues.push({ severity: 'info', app: appName, locale, key, appVal, uiVal });
        } else if (enSource && key in enSource && appVal === enSource[key]) {
          // 覆盖值与英文源一致 — CRITICAL（肯定是忘了翻译）
          allIssues.push({ severity: 'critical', app: appName, locale, key, appVal, uiVal });
        } else {
          // 值不同 — WARNING
          allIssues.push({ severity: 'warning', app: appName, locale, key, appVal, uiVal });
        }
      }
    }
  }

  // ─── 输出 ──────────────────────────────────────────────

  const criticals = allIssues.filter(i => i.severity === 'critical');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const infos = allIssues.filter(i => i.severity === 'info');

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  跨 App 消息覆盖检测`);
  console.log(`═══════════════════════════════════════════════\n`);

  // CRITICAL
  if (criticals.length > 0) {
    console.log(`🔴 CRITICAL: ${criticals.length} 个覆盖值与英文源完全一致（忘了翻译）\n`);
    const byApp = {};
    for (const c of criticals) {
      if (!byApp[c.app]) byApp[c.app] = [];
      byApp[c.app].push(c);
    }
    for (const [app, items] of Object.entries(byApp)) {
      console.log(`  ── ${app} (${items.length}) ──`);
      for (const c of items.slice(0, 15)) {
        console.log(`    [${c.locale}] ${c.key}`);
        console.log(`      App: ${JSON.stringify(c.appVal)}`);
      }
      if (items.length > 15) console.log(`    ... 还有 ${items.length - 15} 个`);
      console.log();
    }
  }

  // WARNING (按 app 分组，最多 20 条)
  if (warnings.length > 0) {
    console.log(`🟡 WARNING: ${warnings.length} 个覆盖值与 UI 包不同\n`);
    const byApp = {};
    for (const w of warnings) {
      if (!byApp[w.app]) byApp[w.app] = [];
      byApp[w.app].push(w);
    }
    for (const [app, items] of Object.entries(byApp)) {
      console.log(`  ── ${app} (${items.length}) ──`);
      for (const w of items.slice(0, 15)) {
        console.log(`    [${w.locale}] ${w.key}`);
        console.log(`      App: ${JSON.stringify(w.appVal)}`);
        console.log(`      UI:  ${JSON.stringify(w.uiVal)}`);
      }
      if (items.length > 15) console.log(`    ... 还有 ${items.length - 15} 个`);
      console.log();
    }
  }

  // INFO (汇总)
  if (infos.length > 0) {
    console.log(`ℹ️  INFO: ${infos.length} 个重复定义（值相同，可直接删除）\n`);
    const byApp = {};
    for (const i of infos) {
      if (!byApp[i.app]) byApp[i.app] = 0;
      byApp[i.app]++;
    }
    for (const [app, count] of Object.entries(byApp)) {
      console.log(`  ${app}: ${count}`);
    }
    console.log();
  }

  // 总结
  console.log(`─────────────────────────────────────────────`);
  console.log(`总计: ${allIssues.length} 个覆盖键`);
  console.log(`  🔴 ${criticals.length}  CRITICAL (与英文源相同)`);
  console.log(`  🟡 ${warnings.length}  WARNING (值不同)`);
  console.log(`  ℹ️  ${infos.length}  INFO (重复)`);
  console.log(`─────────────────────────────────────────────\n`);

  return criticals.length === 0;
}

const passed = run();
if (isCi && !passed) process.exit(1);
