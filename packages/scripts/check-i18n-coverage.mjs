#!/usr/bin/env node
/**
 * check-i18n-coverage.mjs — i18n 翻译覆盖率报告
 *
 * 统计每个 locale 相对于 en.json 的翻译完成度（覆盖率 %）。
 * 分别检查 UI 包、Site、Portal、Blog 四个消息目录。
 *
 * 用法：
 *   node packages/scripts/check-i18n-coverage.mjs
 *   node packages/scripts/check-i18n-coverage.mjs --ci  # 覆盖率 < 99% 时 exit 1（optional）
 *   node packages/scripts/check-i18n-coverage.mjs --ci --threshold=95
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function getDetectedProject() {
  const idx = process.argv.findIndex(a => a.startsWith('--project='));
  if (idx !== -1) return process.argv[idx].split('=')[1];
  const cwd = process.cwd();
  const m = cwd.match(/[/]apps[/]([^/]+)/);
  return m ? m[1] : 'site';
}
const detectedProject = getDetectedProject();

const isCi = process.argv.includes('--ci');
const threshold = parseFloat(
  process.argv.find(a => a.startsWith('--threshold='))?.split('=')[1] || '99'
);

const MSG_DIRS = [
  { name: 'UI 包', dir: path.join(repoRoot, 'packages/ui/messages') },
  { name: detectedProject.charAt(0).toUpperCase() + detectedProject.slice(1), dir: path.join(repoRoot, 'apps', detectedProject, 'messages') },
];

// ─── 辅助函数 ──────────────────────────────────────────────────────────

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

function getLocales(msgDir) {
  return fs.readdirSync(msgDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

}

// ─── 覆盖率和缺失统计 ──────────────────────────────────────────────

function calcCoverage(enKeys, localeKeys) {
  const enKeySet = new Set(Object.keys(enKeys));
  const localeKeySet = new Set(Object.keys(localeKeys));

  const missing = [...enKeySet].filter(k => !localeKeySet.has(k));
  const extra = [...localeKeySet].filter(k => !enKeySet.has(k));

  const total = enKeySet.size;
  const covered = total - missing.length;
  const pct = total > 0 ? (covered / total * 100).toFixed(1) : '100.0';

  return { total, covered, missing, extra, pct };
}

// ─── 输出 ──────────────────────────────────────────────────────────

function run() {
  let allPassed = true;
  const results = [];

  for (const { name, dir } of MSG_DIRS) {
    if (!fs.existsSync(dir)) continue;

    const locales = getLocales(dir);
    const enPath = path.join(dir, 'en.json');
    if (!fs.existsSync(enPath)) continue;

    const enData = readJson(enPath);
    if (!enData) continue;

    const enKeys = flattenKeys(enData);
    const totalEnKeys = Object.keys(enKeys).length;

    console.log(`\n📊 ${name}`);
    console.log(`   en.json: ${totalEnKeys} 键\n`);

    const localeResults = [];

    for (const locale of locales) {
      if (locale === 'en') continue;

      const localePath = path.join(dir, `${locale}.json`);
      const localeData = readJson(localePath);
      if (!localeData) continue;

      const localeKeys = flattenKeys(localeData);
      const { total, covered, missing, extra, pct } = calcCoverage(enKeys, localeKeys);

      localeResults.push({ locale, total, covered, pct, missingCount: missing.length, extraCount: extra.length });

      const barLen = Math.round(parseFloat(pct) / 5);
      const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);

      // 标注 worst 5
      console.log(`   ${locale}  ${bar} ${pct}%  (${covered}/${total}  缺失:${missing.length}  多余:${extra.length})`);
    }

    // 汇总
    const avg = localeResults.reduce((s, r) => s + parseFloat(r.pct), 0) / localeResults.length;
    const worst = localeResults.reduce((a, b) => parseFloat(a.pct) < parseFloat(b.pct) ? a : b);

    const passed = avg >= threshold;
    if (!passed) allPassed = false;

    console.log(`   ─────────────────────────────────────────`);
    console.log(`   平均: ${avg.toFixed(1)}%`);

    // 输出缺失最多的 5 个 locale
    const top5missing = [...localeResults].sort((a, b) => b.missingCount - a.missingCount).slice(0, 5);
    if (top5missing.some(r => r.missingCount > 0)) {
      console.log(`   缺失最多的: ${top5missing.filter(r => r.missingCount > 0).map(r => `${r.locale}(${r.missingCount})`).join(', ')}`);
    }

    results.push({ name, avg: avg.toFixed(1), passed });
  }

  // 总结果
  console.log(`\n═══════════════════════════════════════════════`);
  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}: ${r.avg}%`);
  }
  console.log(`═══════════════════════════════════════════════\n`);

  return allPassed;
}

const passed = run();
if (isCi && !passed) process.exit(1);
