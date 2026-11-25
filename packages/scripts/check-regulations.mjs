#!/usr/bin/env node
/**
 * check-regulations.mjs — 法规库内容结构门禁（48 语言 × N 篇全量）
 *
 * 为什么单独写一个：
 * check-md-article.mjs 是给 insights 写的（要求文末有 CTA 链接、有封面图、
 * 有 references），规则套到法规上会全量误报（实测 3984/3984）。
 * 而法规的规则其实非常明确 —— 都写在投稿工具包的
 * docs/submission-kit/core/consts/metadata.py 里，只是没人搬到 CI。
 *
 * 结果就是：法规库 83 篇 × 48 语言 = 3984 个文件，入库后**零检查**。
 * 一旦入库脚本的规范化逻辑被改坏（比如漏删 slug、误删 effective_at、
 * 标记写成两个），只有等线上页面显示异常才会发现。
 *
 * 本脚本把 metadata.py 的常量当唯一事实源（下面 CONSTS 与之逐项对应），
 * 校验「入库后的文件」而不是「投稿包」—— 所以 slug 属于禁止项
 * （入库时会被删掉，见 MEMORY「法规入库规范化」）。
 *
 * 用法：
 *   node packages/scripts/check-regulations.mjs
 *   node packages/scripts/check-regulations.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const CONTENT_DIR = path.join(repoRoot, 'apps/regulations/content');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

const RESULTS = { passed: 0, failed: 0, warnings: [] };
const fail = (m) => { RESULTS.failed++; RESULTS.warnings.push(`  ❌ ${m}`); };
const pass = () => { RESULTS.passed++; };

// ════════════════════════════════════════════════════════
// 规范常量 —— 与 docs/submission-kit/core/consts/metadata.py 保持一致
// ════════════════════════════════════════════════════════
const ORIGINAL_MARKER = '<!-- original -->';
const REG_CATEGORIES = new Set([
  'Product Certification', 'Compliance Guide', 'Label Compliance',
  'Brand Protection', 'Cosmetics', 'E-commerce', 'Food & Beverage',
]);
const REG_ISSUERS = new Set([
  'GACC', 'SAMR', 'NMPA', 'MARA', 'MOFCOM', 'STA', 'CNIPA',
  'NPC', 'SC', 'MIIT', 'MEE', 'NHFPC',
]);
const REG_SERVICES = new Set([
  '/services/gacc/', '/services/label/', '/services/ccc/',
  '/services/cosmetics/', '/services/ecommerce/', '/services/brand/',
]);
const STATUS_ENUM = new Set(['in_force', 'upcoming', 'amended', 'repealed', 'draft']);
const MAX_EXCERPT = 185;
const MAX_TITLE = 85;
const INTERPRET_MAX = { cjk: 300, other: 1000 };
const CJK_LANGS = new Set(['zh', 'ja', 'ko']);

// 入库后允许的键（slug / date / images 都不允许 —— 前者入库时删，后两个从不使用）
const ALLOWED_KEYS = new Set([
  'title', 'category', 'excerpt', 'doc_number', 'issuer',
  'published_at', 'effective_at', 'status', 'source_url', 'related_service',
]);
const REQUIRED_KEYS = [...ALLOWED_KEYS].filter((k) => k !== 'related_service');

// ── 前置 ──
if (!fs.existsSync(CONTENT_DIR)) {
  console.log('  ∎ check-regulations.mjs → ∅ 无法规内容目录，跳过');
  process.exit(0);
}

/** 极简 frontmatter 解析：容忍带引号/不带引号（见 MEMORY 踩坑） */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (mm) out[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const langs = fs.readdirSync(CONTENT_DIR)
  .filter((d) => !d.startsWith('_') && fs.statSync(path.join(CONTENT_DIR, d)).isDirectory())
  .sort();

if (langs.length === 0) {
  console.log('  ∎ 无语言目录，跳过');
  process.exit(0);
}

// ════════════════════════════════════════════════════════
// A / B. 逐文件结构校验
// ════════════════════════════════════════════════════════
console.log('\n🔍 A/B. frontmatter + 正文结构');
const slugSets = new Map();
const violations = { fm: 0, marker: 0, interpret: 0, length: 0 };
let fileCount = 0;

for (const lang of langs) {
  const dir = path.join(CONTENT_DIR, lang);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).sort();
  slugSets.set(lang, new Set(files.map((f) => f.replace(/\.mdx$/, ''))));

  for (const file of files) {
    fileCount++;
    const rel = `${lang}/${file}`;
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const fm = parseFrontmatter(raw);
    let ok = true;

    if (!fm) {
      fail(`${rel}: 没有 frontmatter`);
      violations.fm++;
      continue;
    }

    // 键集合
    const keys = Object.keys(fm);
    for (const k of keys) {
      if (!ALLOWED_KEYS.has(k)) {
        fail(`${rel}: 不允许的键 "${k}"（入库后应只保留 10 个规范键）`);
        ok = false;
        violations.fm++;
      }
    }
    for (const k of REQUIRED_KEYS) {
      if (!(k in fm)) {
        fail(`${rel}: 缺少必需键 "${k}"`);
        ok = false;
        violations.fm++;
      }
    }

    // 枚举与格式
    if (fm.status && !STATUS_ENUM.has(fm.status)) {
      fail(`${rel}: status="${fm.status}" 不在枚举 ${[...STATUS_ENUM].join('|')}`);
      ok = false; violations.fm++;
    }
    if (fm.category && !REG_CATEGORIES.has(fm.category)) {
      fail(`${rel}: category="${fm.category}" 不是博客那 7 类之一`);
      ok = false; violations.fm++;
    }
    if (fm.issuer && !REG_ISSUERS.has(fm.issuer)) {
      fail(`${rel}: issuer="${fm.issuer}" 不在 12 个机构内`);
      ok = false; violations.fm++;
    }
    if (fm.related_service && !REG_SERVICES.has(fm.related_service)) {
      fail(`${rel}: related_service="${fm.related_service}" 不是 6 个服务页之一`);
      ok = false; violations.fm++;
    }
    for (const dk of ['published_at', 'effective_at']) {
      if (fm[dk] && !/^\d{4}-\d{2}-\d{2}$/.test(fm[dk])) {
        fail(`${rel}: ${dk}="${fm[dk]}" 不是 YYYY-MM-DD`);
        ok = false; violations.fm++;
      }
    }
    if (fm.source_url && !/^https?:\/\//.test(fm.source_url)) {
      fail(`${rel}: source_url 不是 http(s) 链接：${fm.source_url}`);
      ok = false; violations.fm++;
    }

    // 篇幅
    if (fm.title && fm.title.length > MAX_TITLE) {
      fail(`${rel}: title ${fm.title.length} > ${MAX_TITLE} 字符`);
      ok = false; violations.length++;
    }
    if (fm.excerpt && fm.excerpt.length > MAX_EXCERPT) {
      fail(`${rel}: excerpt ${fm.excerpt.length} > ${MAX_EXCERPT} 字符`);
      ok = false; violations.length++;
    }

    // 正文结构：官方文本标记恰好一个
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
    const markerCount = body.split(ORIGINAL_MARKER).length - 1;
    if (markerCount !== 1) {
      fail(`${rel}: "${ORIGINAL_MARKER}" 出现 ${markerCount} 次，必须恰好 1 次`);
      ok = false; violations.marker++;
    } else {
      // 解读段篇幅（标记之前的部分，剔除空白与 markdown 标记）
      const head = body.split(ORIGINAL_MARKER)[0];
      const visible = head.replace(/[\s*_`#>\-[\]()]/g, '');
      const limit = CJK_LANGS.has(lang) ? INTERPRET_MAX.cjk : INTERPRET_MAX.other;
      if (visible.length > limit) {
        fail(`${rel}: 解读段 ${visible.length} 字符 > 上限 ${limit}`);
        ok = false; violations.interpret++;
      }
    }

    if (ok) pass();
  }
}

// ════════════════════════════════════════════════════════
// C. 48 语言的 slug 集合必须一致
// ════════════════════════════════════════════════════════
console.log('\n🔍 C. 跨语言 slug 集合一致性');
const enSet = slugSets.get('en');
if (!enSet) {
  fail('缺少 en 目录');
} else {
  let mismatched = 0;
  for (const [lang, set] of slugSets) {
    const missing = [...enSet].filter((s) => !set.has(s));
    const extra = [...set].filter((s) => !enSet.has(s));
    if (missing.length || extra.length) {
      mismatched++;
      fail(`${lang}: 缺 ${missing.length} 篇${missing.length ? `（如 ${missing[0]}）` : ''}，多 ${extra.length} 篇${extra.length ? `（如 ${extra[0]}）` : ''}`);
    } else {
      pass();
    }
  }
  if (mismatched === 0) console.log(`  ✅ ${langs.length} 语言 × ${enSet.size} 篇，slug 完全一致`);
}

// ════════════════════════════════════════════════════════
// 汇总
// ════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(52));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);
console.log(`   ${langs.length} 语言 × 共 ${fileCount} 个文件`);
if (RESULTS.failed > 0) {
  console.log(`   违规分布: frontmatter ${violations.fm} / 标记 ${violations.marker} / 解读段 ${violations.interpret} / 篇幅 ${violations.length}`);
}
if (RESULTS.warnings.length > 0) {
  console.log('\n' + RESULTS.warnings.slice(0, 25).join('\n'));
  if (RESULTS.warnings.length > 25) console.log(`  … 另有 ${RESULTS.warnings.length - 25} 条`);
}
if (isCi && RESULTS.failed > 0) process.exit(1);
console.log('\n✅ check-regulations.mjs 完成');
