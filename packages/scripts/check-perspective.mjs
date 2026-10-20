#!/usr/bin/env node
/**
 * check-perspective.mjs — 文案视角防回归（"出口到中国"口径）
 *
 * 背景：站点面向的是「把产品卖进中国的外国出口商」，不是「中国的进口商」。
 * 因此标题/描述/JSON-LD/服务名一类口径文案不得再出现 “China Import Compliance”
 * 这类以中国进口为主语的表述。
 *
 * 默认只告警（退出码 0），加 --strict 才失败。
 * 专有名词白名单：CIFER 官方名、Import Record Number、进口注册证、Decree 243 等。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const FORBIDDEN = [
  'China Import Compliance',
  'China import compliance',
  'China Import Insights',
  'China import regulations',
  'Import Compliance Services',
  'Import Compliance FAQ',
  'Import Compliance by Industry',
  'Import Compliance Data',
  'import consulting',
  'Import consulting',
  'China Import Food Enterprise Registration', // 仅允许出现在 DefinitionSchema.cifer* 与 portal 词典
];

// 允许出现的位置（官方专名 / 法条名）
const ALLOW = [
  /DefinitionSchema\.cifer/i,
  /Check\.gaccGlossary_cifer/i,
  /gaccReg_ciferSystem_number/i,
  /ciferDefinition/i,
  /CIFER \(China Import Food Enterprise Registration\)/,
];

const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'dist', '.turbo', '.git']);
const SCAN_EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.json']);

const hits = [];

function allowed(text, where) {
  if (ALLOW.some((re) => re.test(where))) return true;
  return false;
}

function scanText(text, where, lineNo) {
  for (const phrase of FORBIDDEN) {
    let idx = text.indexOf(phrase);
    while (idx !== -1) {
      const isOfficialName =
        text.slice(Math.max(0, idx - 7), idx) === 'CIFER (' || text.includes('CIFER System') || text.slice(Math.max(0, idx - 8), idx) === 'CIFER — ';
      if (!isOfficialName && !allowed(text.slice(Math.max(0, idx - 120), idx + phrase.length), where)) {
        hits.push({ where, lineNo, phrase, snippet: text.slice(Math.max(0, idx - 40), idx + phrase.length + 40).replace(/\s+/g, ' ') });
      }
      idx = text.indexOf(phrase, idx + phrase.length);
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!SCAN_EXT.has(ext)) continue;
    if (full.endsWith('check-perspective.mjs')) continue;
    if (full.endsWith('check-hardcoded.mjs')) continue; // 白名单登记表，非用户文案
    const rel = path.relative(root, full);
    const text = fs.readFileSync(full, 'utf8');
    if (!/import|Import/.test(text)) continue;
    if (rel.includes('/messages/') && rel.endsWith('.json')) {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
      for (const [ns, obj] of Object.entries(data)) {
        if (!obj || typeof obj !== 'object') continue;
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v !== 'string') continue;
          scanText(v, `${rel}:${ns}.${k}`, 0);
        }
      }
      continue;
    }
    const lines = text.split('\n');
    lines.forEach((line, i) => scanText(line, rel, i + 1));
  }
}

for (const target of ['apps', 'packages/ui/src', 'packages/scripts']) {
  const p = path.join(root, target);
  if (fs.existsSync(p)) walk(p);
}

const unique = [...new Map(hits.map((h) => [`${h.where}|${h.phrase}`, h])).values()];

if (unique.length === 0) {
  console.log('✅ 视角检查通过：未发现「中国进口」口径残留');
  process.exit(0);
}

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  ⚠️  视角检查告警：发现「中国进口」口径文案                  ║');
console.log('║  口径要求：以「把产品出口到中国的外国出口商」为主语           ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`  共 ${unique.length} 处`);
for (const h of unique.slice(0, 60)) {
  console.log(`  ⚠ ${h.where}${h.lineNo ? ':' + h.lineNo : ''}  「${h.phrase}」`);
  if (h.snippet) console.log(`      ${h.snippet}`);
}
if (unique.length > 60) console.log(`  … 还有 ${unique.length - 60} 处`);

if (process.argv.includes('--strict')) process.exit(1);
console.log('\n（告警模式，不阻断构建）');
process.exit(0);
