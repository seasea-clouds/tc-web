#!/usr/bin/env node
/**
 * check-company-facts.mjs — 公司固有事实（地址／公司名／年限）在全部文案里的一致性
 *
 * 背景（2026-11-25 实际踩到）：
 * 把公司地址从上海改成北京时，第一轮只搜了 address / Shanghai，改了
 * Footer.address、reportFooterAddress、JSON-LD。结果漏掉两个键：
 *   - AiAssistance.contactLocation（地址）
 *   - AiAssistance.aboutContent（长句里的「Shanghai-based 监管合规公司」）
 * 线上 HTML 抓下来才发现还在写上海。根因不是手滑，是**同一事实散落在多个 key、
 * 没有单一来源也没有交叉校验**，靠人记「一共有几处」必然漏。
 *
 * 本脚本把「公司事实必须处处一致」变成门禁。
 *
 * 检查项：
 *   A. 地址类 key 里不得出现「公司旧地址」的词根（新地址由事实源决定，见 FACTS）
 *   B. 地址类 key 的词根必须与事实源一致（每个语言都要指向同一座城市）
 *   C. PDF 等硬编码文件里的公司地址必须与事实源逐字一致
 *
 * ⚠️ 只查显式声明的 FACT_KEYS —— 港口清关时效、客户分布、法规正文里的地名
 * 都是事实性内容，不能因为出现「上海」就报错。要新增覆盖面就加进 FACT_KEYS。
 *
 * 用法：
 *   node packages/scripts/check-company-facts.mjs
 *   node packages/scripts/check-company-facts.mjs --ci
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');

const RESULTS = { passed: 0, failed: 0, warnings: [] };
const fail = (m) => { RESULTS.failed++; RESULTS.warnings.push(`  ❌ ${m}`); };
const pass = () => { RESULTS.passed++; };

// ════════════════════════════════════════════════════════
// 事实源：公司当前地址
// 改地址时只改这里 —— 本脚本会用 stale 词根反查全站有没有漏改。
// 词根用「词干 + 包含匹配」而不是整词：屈折语言会加后缀
// （Pekingi / Pekingssa / Pekinu / Пекіне / שנחאי …），整词匹配必然漏。
// ════════════════════════════════════════════════════════
const FACTS = {
  current: {
    name: '北京 / Beijing',
    roots: ['beijin', 'pekin', 'peking', 'pequ', 'pechin', 'πεκ',
            'пек', 'бек', 'بكين', 'پکن', '北京', 'ベイジ', '베이징',
            'პეკ', 'պեկ', 'בייג', 'பெய்ஜ', 'बीज', 'बेइज',
            'বেইজ', 'ปักกิ่ง', 'bac kinh', 'بیج', 'බීජ'],
  },
  // 旧地址词根 —— 命中任意一个即说明有地方没跟着改
  stale: {
    name: '上海 / Shanghai',
    roots: ['shangha', 'shangai', 'sjangha', 'xangai', 'sangha', 'szangha',
            'sangay', 'sanxay', 'shangaj', 'σαγκ',
            'шанха', 'шанг', 'شنغهاي', 'شانگهای', 'شنگھائی',
            '上海', '静安', 'jingan', "jing'an",
            '상하이', '징안', 'جينغان', 'ჯინგან', 'ஷாங்காய', 'เซี่ยงไฮ้',
            'ෂැංහ', 'שנחאי', 'שנגחאי', 'Շանհայ', 'შანხა', 'शंघाई',
            'सांघाई', 'සැංහ', 'цзінган', 'цзинган', 'джинган'],
  },
};

// 会写公司地址的 key（新增地址类文案时加到这里）
const FACT_KEYS = [
  { dir: 'packages/ui/messages', key: 'Footer.address' },
  { dir: 'apps/site/messages', key: 'AiAssistance.contactLocation' },
  { dir: 'apps/site/messages', key: 'AiAssistance.aboutContent' },
  { dir: 'apps/portal/messages', key: 'Check.reportFooterAddress' },
];

const flatten = (obj, prefix = '') => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else if (typeof v === 'string') out[full] = v;
  }
  return out;
};

// 词干包含匹配：先 NFD 去变音符号再比（Pekín→pekin、Pékin→pekin、Šanghaj→sanghaj）。
// 屈折语言还会加后缀（Pekingi / Pekingssa / Пекіне），所以只能做「包含」而非整词。
const norm = (str) => str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const hit = (text, roots) => {
  const t = norm(text);
  return roots.find((r) => t.includes(norm(r)));
};

// ════════════════════════════════════════════════════════
// A / B. messages 里的地址类 key
// ════════════════════════════════════════════════════════
console.log('\n🔍 A/B. 地址类文案与事实源一致');

for (const { dir, key } of FACT_KEYS) {
  const full = path.join(repoRoot, dir);
  if (!fs.existsSync(full)) {
    RESULTS.warnings.push(`  ⚠️ ${dir} 不存在，跳过 ${key}`);
    continue;
  }
  const files = fs.readdirSync(full).filter((f) => f.endsWith('.json'));
  let checked = 0;
  for (const f of files) {
    const locale = f.replace(/\.json$/, '');
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(full, f), 'utf-8'));
    } catch {
      fail(`${dir}/${f} 不是合法 JSON`);
      continue;
    }
    const val = flatten(data)[key];
    if (val === undefined) {
      fail(`${dir}/${f} 缺少 ${key}（该 key 是地址事实源，48 语言必须齐）`);
      continue;
    }
    checked++;
    // A. 不得残留旧地址
    const staleHit = hit(val, FACTS.stale.roots);
    if (staleHit) {
      fail(`${dir}/${locale}.json 的 ${key} 仍写着旧地址「${staleHit}」：${val.slice(0, 60)}`);
      continue;
    }
    // B. 必须指向新地址
    if (!hit(val, FACTS.current.roots)) {
      fail(`${dir}/${locale}.json 的 ${key} 既不是旧地址也不是新地址，无法判定：${val.slice(0, 60)}`);
      continue;
    }
    pass();
  }
  if (checked > 0) console.log(`  · ${dir} ${key}: ${checked} 语言`);
}

// ════════════════════════════════════════════════════════
// C. 硬编码文件里的公司地址必须与事实源逐字一致
// ════════════════════════════════════════════════════════
console.log('\n🔍 C. 硬编码公司地址与 Footer.address 一致');

const footerFile = path.join(repoRoot, 'packages/ui/messages/en.json');
let footerAddress = null;
if (fs.existsSync(footerFile)) {
  footerAddress = flatten(JSON.parse(fs.readFileSync(footerFile, 'utf-8')))['Footer.address'];
}
if (!footerAddress) {
  fail('读不到 packages/ui/messages/en.json 的 Footer.address，无法做硬编码比对');
} else {
  // 扫所有源码里形如 "SinoTrade Compliance — <地址>" 或 "SinoTrade Compliance - <地址>" 的字符串
  // 只认「SinoTrade Compliance — <地址>」且地址里必须含 China/中国，
  // 否则会把 "SinoTrade Compliance — all services..." 这类标题也当成地址
  const HARDCODE_RE = /SinoTrade Compliance\s*[—–-]\s*([^"'`\n]{3,80})/g;
  const scanDirs = ['apps', 'packages', 'workers'];
  let found = 0;
  const walkFiles = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'out', '.next', '.turbo', 'dist'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkFiles(p);
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && e.name !== 'check-company-facts.mjs') {
        const src = fs.readFileSync(p, 'utf-8');
        for (const m of src.matchAll(HARDCODE_RE)) {
          // 去掉 JSX 标签残留，且必须是地址（含国家名）
          const addr = m[1].replace(/<[^>]*>/g, '').trim();
          if (!/China|中国/.test(addr)) continue;
          found++;
          const loc = path.relative(repoRoot, p);
          if (addr !== footerAddress) {
            fail(`${loc} 硬编码地址「${addr}」≠ Footer.address「${footerAddress}」`);
          } else {
            pass();
          }
        }
      }
    }
  };
  for (const d of scanDirs) {
    const full = path.join(repoRoot, d);
    if (fs.existsSync(full)) walkFiles(full);
  }
  console.log(`  · 扫到 ${found} 处硬编码公司地址`);
  if (found === 0) {
    RESULTS.warnings.push('  ⚠️ 一处硬编码都没扫到 —— 若 PDF 页脚改过写法，记得同步本脚本的正则');
  }
}

// ════════════════════════════════════════════════════════
// D. 事实源自查：current 与 stale 词根不能重叠
// ════════════════════════════════════════════════════════
console.log('\n🔍 D. 事实源自检');
const overlap = FACTS.current.roots.filter((r) => FACTS.stale.roots.includes(r));
if (overlap.length > 0) {
  fail(`current 与 stale 词根重叠：${overlap.join(', ')} —— 会导致判定自相矛盾`);
} else {
  pass();
  console.log(`  ✅ current ${FACTS.current.roots.length} 个词根 / stale ${FACTS.stale.roots.length} 个词根，无重叠`);
}

console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${RESULTS.passed} 通过, ${RESULTS.failed} 失败`);
console.log(`   事实源: 公司地址 = ${FACTS.current.name}`);
if (RESULTS.warnings.length > 0) console.log('\n' + RESULTS.warnings.join('\n'));
if (isCi && RESULTS.failed > 0) process.exit(1);
console.log('\n✅ check-company-facts.mjs 完成');
