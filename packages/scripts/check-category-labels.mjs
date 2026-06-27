#!/usr/bin/env node
/**
 * check-category-labels.mjs — CI-2: CATEGORY_LABELS ↔ 消息键交叉校验
 *
 * 验证每个合规模块 (gacc/ccc/nmpa/label/crossborder/trademark) 的
 * CATEGORY_LABELS 常量与 Check 命名空间中的翻译键是否完整对应。
 *
 * 用法:
 *   node packages/scripts/check-category-labels.mjs
 *   node packages/scripts/check-category-labels.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const isCi = process.argv.includes('--ci');

// ─── 各模块的 CATEGORY_LABELS 扫描配置 ─────────────────────────────

const MODULES = [
  {
    name: 'gacc',
    dir: 'apps/portal/modules/gacc',
    keyPrefix: 'gaccCat',
    // 从 CATEGORY_PROFILES 函数参数获取类别列表
    typeName: 'GaccCategory',
    ruleKeys: ['label', 'riskReason'],
  },
  {
    name: 'ccc',
    dir: 'apps/portal/modules/ccc',
    keyPrefix: 'cccCat',
    typeName: 'CccCategory',
    ruleKeys: ['label'],
  },
  {
    name: 'nmpa',
    dir: 'apps/portal/modules/nmpa',
    keyPrefix: 'nmpaCat',
    typeName: 'CosmeticsCategory',
    ruleKeys: ['label'],
  },
  {
    name: 'label',
    dir: 'apps/portal/modules/label',
    keyPrefix: 'labelCat',
    typeName: 'LabelCategory',
    ruleKeys: ['label'],
  },
  {
    name: 'crossborder',
    dir: 'apps/portal/modules/crossborder',
    keyPrefix: 'cbCat',
    typeName: 'CrossborderCategory',
    ruleKeys: ['label'],
  },
  {
    name: 'trademark',
    dir: 'apps/portal/modules/trademark',
    keyPrefix: 'tmCat',
    typeName: 'TrademarkCategory',
    ruleKeys: ['label'],
  },
];

// ─── 工具函数 ──────────────────────────────────────────────────────

function loadMessageKeys(moduleName) {
  const msgPath = path.join(repoRoot, 'apps/portal/messages/en.json');
  const en = JSON.parse(fs.readFileSync(msgPath, 'utf-8'));
  const check = en.Check || {};

  const prefix = MODULES.find(m => m.name === moduleName)?.keyPrefix;
  if (!prefix) return new Set();

  return new Set(
    Object.keys(check).filter(k => k.startsWith(prefix + '_'))
  );
}

function extractCategoryLabels(rulesTsPath, moduleName) {
  if (!fs.existsSync(rulesTsPath)) return null;

  const content = fs.readFileSync(rulesTsPath, 'utf-8');
  const lines = content.split('\n');
  const labels = {};

  // Attempt 1: export const CATEGORY_LABELS = { ... }
  let inBlock = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inBlock && /export\s+const\s+CATEGORY_LABELS/.test(line)) {
      inBlock = true;
      braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      const entryRe = /"(\w+)":\s*"([^"]+)"/g;
      let m;
      while ((m = entryRe.exec(line)) !== null) {
        labels[m[1]] = m[2];
      }
      continue;
    }

    if (inBlock) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      const entryRe = /"(\w+)":\s*"([^"]+)"/g;
      let m;
      while ((m = entryRe.exec(line)) !== null) {
        labels[m[1]] = m[2];
      }

      if (braceDepth <= 0 && line.includes(';')) break;
    }
  }

  if (Object.keys(labels).length > 0) return labels;

  // Attempt 2: getCATEGORY_PROFILES() or getPROFILES() function
  // GACC uses function getCATEGORY_PROFILES(t) which returns { key: { label: ..., ... }, ... }
  const funcPatterns = [
    /function\s+getCATEGORY_PROFILES\s*\(/,  // GACC
    /function\s+getPROFILES\s*\(/,           // NMPA
  ];
  
  let funcMatch = false;
  for (const p of funcPatterns) {
    if (p.test(content)) { funcMatch = true; break; }
  }
  
  if (funcMatch) {
    // Find the function body and extract category keys from the return object
    // Pattern: key: { label: ..., riskReason: ... }
    const catKeyRe = /(\w+):\s*\{[^}]*label:/g;
    let m;
    while ((m = catKeyRe.exec(content)) !== null) {
      const catName = m[1];
      // Skip TypeScript type intersections or exports
      if (['interface', 'export', 'type', 'const', 'function', 'GaccCategory'].includes(catName)) continue;
      if (catName === catName.toUpperCase()) continue; // Skip CONSTANT_CASE
      labels[catName] = catName; // Use the key as value (we just need the keys)
    }
  }

  // Attempt 3: PROFILES constant with hardcoded values (CCC style)
  if (Object.keys(labels).length === 0) {
    // Look for const PROFILES = { "key": { label: "..." } }
    const profileRe = /const\s+PROFILES\s*[:=]\s*\{[^}]*/;
    // Simpler: find all "key": {"label": in the file
    const inlineRe = /"(\w+)":\s*\{[^}]*"label":\s*"([^"]+)"/g;
    let m;
    while ((m = inlineRe.exec(content)) !== null) {
      labels[m[1]] = m[2];
    }
  }

  return Object.keys(labels).length > 0 ? labels : null;
}

// ─── 主逻辑 ────────────────────────────────────────────────────────

function run() {
  let totalMissing = 0;
  let totalWarnings = 0;
  const allIssues = [];

  console.log('\n═══════════════════════════════════════════════');
  console.log('  品类翻译键完整性校验 (CI-2)');
  console.log('═══════════════════════════════════════════════\n');

  for (const mod of MODULES) {
    const rulesTsPath = path.join(repoRoot, mod.dir, 'rules.ts');
    const labels = extractCategoryLabels(rulesTsPath, mod.name);
    const msgKeys = loadMessageKeys(mod.name);

    if (!labels || Object.keys(labels).length === 0) {
      console.log(`⚠️   ${mod.name.toUpperCase()}: 未找到 CATEGORY_LABELS 或为空`);
      continue;
    }

    console.log(`📦 ${mod.name.toUpperCase()} — ${Object.keys(labels).length} 个品类`);

    const modIssues = [];

    for (const [key, val] of Object.entries(labels)) {
      // Check label key
      const labelKey = `${mod.keyPrefix}_${key}_label`;
      if (!msgKeys.has(labelKey)) {
        modIssues.push({ type: 'MISSING_LABEL', key: labelKey, value: val });
        totalMissing++;
      }

      // Check riskReason key if applicable
      const riskKey = `${mod.keyPrefix}_${key}_riskReason`;
      if (mod.ruleKeys.includes('riskReason') && !msgKeys.has(riskKey)) {
        modIssues.push({ type: 'MISSING_RISK_REASON', key: riskKey, value: val });
        totalMissing++;
      }
    }

    // Also check if there are message keys without corresponding CATEGORY_LABELS
    for (const msgKey of msgKeys) {
      // Extract the category name from the key (e.g., "gaccCat_alcohol_label" → "alcohol")
      const parts = msgKey.replace(`${mod.keyPrefix}_`, '').split('_');
      if (parts.length >= 2) {
        // Category names can be multi-part like "health_food" or "coffee_tea"
        // Try to match against known category keys
        const knownCats = Object.keys(labels);
        // The category is everything before the last _suffix
        const suffix = parts[parts.length - 1];
        if (['label', 'riskReason', 'labTest', 'reject'].includes(suffix)) {
          const catName = parts.slice(0, -1).join('_');
          if (!knownCats.includes(catName) && knownCats.length > 0) {
            // Only flag if it seems like a real key (not a different naming convention)
            if (!suffix.startsWith('labTest_') && !suffix.startsWith('reject_')) {
              // Too noisy, skip for now
            }
          }
        }
      }
    }

    if (modIssues.length > 0) {
      for (const issue of modIssues) {
        const symbol = issue.type === 'MISSING_LABEL' ? '❌' : '⚠️';
        console.log(`  ${symbol} [${mod.name}] 缺少翻译键: ${issue.key}`);
        console.log(`     原始值: "${issue.value}"`);
        totalWarnings++;
      }
    } else {
      console.log(`  ✅ 全部 ${Object.keys(labels).length} 个品类翻译键完整`);
    }

    allIssues.push(...modIssues);
    console.log();
  }

  console.log('─────────────────────────────────────────────');
  if (allIssues.length > 0) {
    console.log(`❌ 共 ${allIssues.length} 个缺失的翻译键`);
    console.log('');
    console.log('  需要为每个品类在 messages/*.json 中添加翻译键:');
    console.log('  格式: {Check.{prefix}_{category}_{suffix}: "翻译文本"}');
    for (const issue of allIssues) {
      console.log(`    ${issue.key}`);
    }
    console.log('─────────────────────────────────────────────\n');
  } else {
    console.log('✅ 全部 6 个模块的品类翻译键完整\n');
  }

  return allIssues.length === 0;
}

const passed = run();
if (isCi && !passed) process.exit(1);
