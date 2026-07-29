#!/usr/bin/env node
/**
 * ci-check.mjs — 统一 CI 检查入口
 *
 * 所有子站（site / portal / blog / admin）共享此脚本。
 * 所有检查脚本统一在 packages/scripts/ 中，此脚本负责依次调度。
 *
 * 所有子站跑完全相同的检查列表，不做按项目裁剪。
 * 通过 --project=<name> 将子站名传给每个检查脚本，
 * 子站自动识别逻辑统一在 ci-check.mjs，各检查脚本不再各自硬编码。
 *
 * 用法：
 *   node ci-check.mjs --project=admin --sync --ci   # 同步翻译 + 全部检查
 *   node ci-check.mjs --project=site --ci            # 仅检查（不 sync）
 *   node ci-check.mjs --all --sync                   # 所有子站
 *   node ci-check.mjs --out-dir=out --ci             # 包含输出检查（需先编译）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname);
const REPO_ROOT = path.resolve(__dirname, '../..');

// 自动发现所有子站（多指标检测：tsconfig / next.config / package.json / src）
const ALL_PROJECTS = (() => {
  const appsDir = path.join(REPO_ROOT, 'apps');
  if (!fs.existsSync(appsDir)) return [];

  const PROJECT_INDICATORS = [
    'tsconfig.json',
    'next.config.mjs',
    'next.config.js',
    'next.config.ts',
    'package.json',
    'src',
  ];

  function isProject(dirName) {
    return PROJECT_INDICATORS.some(indicator =>
      fs.existsSync(path.join(appsDir, dirName, indicator))
    );
  }

  return fs.readdirSync(appsDir)
    .filter(p => {
      const fullPath = path.join(appsDir, p);
      try { return fs.statSync(fullPath).isDirectory(); } catch { return false; }
    })
    .filter(p => !p.startsWith('.') && !p.startsWith('_'))
    .filter(p => !['node_modules', '.turbo'].includes(p))
    .filter(isProject)
    .sort();
})();

// ============================================================
// 参数解析
// ============================================================
const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const runAll = args.includes('--all');
const doSync = args.includes('--sync');

function detectProject() {
  const explicit = args.find(x => x.startsWith('--project='));
  if (explicit) return explicit.split('=')[1];
  const cwd = process.cwd();
  const m = cwd.match(/\/apps\/([^/]+)(\/|$)/);
  if (m) return m[1];
  console.warn('⚠️  无法自动识别项目，默认使用 site');
  return 'site';
}

const project = (() => {
  const explicit = args.find(x => x.startsWith('--project='));
  return explicit ? explicit.split('=')[1] : detectProject();
})();

const outDir = (() => {
  const a = args.find(x => x.startsWith('--out-dir='));
  return a ? a.split('=')[1] : null;
})();
const nextDir = (() => {
  const a = args.find(x => x.startsWith('--next-dir='));
  return a ? a.split('=')[1] : null;
})();
const llmsDir = (() => {
  const a = args.find(x => x.startsWith('--llms-dir='));
  return a ? a.split('=')[1] : (outDir || 'public');
})();

// ============================================================
// 工具
// ============================================================
let totalFailures = 0;
let _currentProject = '';
const failureDetails = {}; // { project: [{ script, status }] }

const PROJECT_DIRS = {};
for (const p of ALL_PROJECTS) {
  PROJECT_DIRS[p] = path.join(REPO_ROOT, 'apps', p);
}

function getCwd(p) {
  return PROJECT_DIRS[p] || path.join(REPO_ROOT, 'apps', 'site');
}

/**
 * 运行单个检查脚本
 * - 自动追加 --project=<projectName>
 * - 自动追加 --ci（所有脚本一视同仁，发现问题即阻断构建）
 */
function runScript(projectName, scriptName, cwd, ...extraArgs) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.log(`  ⚠️ 脚本不存在: ${scriptName}，跳过`);
    return;
  }

  const scriptArgs = [`--project=${projectName}`, ...extraArgs];
  if (isCi) scriptArgs.push('--ci');

  console.log(`\n▶ ${scriptName} ${scriptArgs.join(' ')}`);

  const result = spawnSync('node', [scriptPath, ...scriptArgs], {
    cwd,
    stdio: 'inherit',
    shell: true,
    timeout: 300000,
  });

  if (result.status !== 0) {
    totalFailures += result.status ?? 1;
    if (_currentProject) {
      if (!failureDetails[_currentProject]) failureDetails[_currentProject] = [];
      failureDetails[_currentProject].push({ script: scriptName, status: result.status ?? 1 });
    }
  }
  return result.status;
}

// 检查 monorepo 级的目录是否存在（用于确定某个检查是否适用于当前项目）
function repoDirExists(subPath) {
  return fs.existsSync(path.join(REPO_ROOT, subPath));
}

// ============================================================
// 翻译自动同步（--sync 时启用）
// ============================================================
function runSync() {
  const syncScript = path.join(SCRIPTS_DIR, 'sync-messages.mjs');
  if (!fs.existsSync(syncScript)) {
    console.log(`  ⚠️ scripts/sync-messages.mjs 不存在，跳过同步`);
    return;
  }
  console.log(`\n▶ 翻译同步 (sync-messages.mjs --all)`);
  const result = spawnSync('node', [syncScript, '--all'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: true,
    timeout: 120000,
  });
  if (result.status !== 0) {
    console.log(`  ⚠️ 翻译同步返回非零，继续执行检查`);
  }
}

// ============================================================
// 全局检查清单 — 每个子站跑完全相同的列表
// ============================================================
const CHECK_LIST = [
  // ── 源码检查（无需编译） ────────────────────────────────
  { script: 'check-seo-patterns.mjs' },
  { script: 'check-hardcoded-domain.mjs' },
  { script: 'check-hardcoded.mjs' },
  { script: 'check-console.mjs' },
  { script: 'check-rtl.mjs' },
  { script: 'check-map-key.mjs' },
  { script: 'check-jsonld.mjs' },
  { script: 'check-md-format.mjs' },
  { script: 'check-md-structure.mjs' },
  { script: 'check-md-article.mjs' },
  { script: 'check-locale-prefix.mjs' },

  // ── 翻译检查（无需编译） ────────────────────────────────
  { script: 'check-translations.mjs', args: ['--short'] },
  { script: 'check-i18n-keys.mjs' },
  { script: 'check-i18n-coverage.mjs' },
  { script: 'check-report-rules.mjs' },
  { script: 'check-report-dates.mjs' },
  { script: 'check-t-keys-all.mjs' },
  { script: 'check-colon-all.mjs' },

  // ── Portal 级数据检查（也跑在所有子站上，只在有相应数据时生效） ──
  { script: 'check-override-keys.mjs' },
  { script: 'check-hardcoded-templates.mjs', guardDir: 'apps/portal/modules' },
  { script: 'check-report-section-i18n.mjs', guardDir: 'apps/portal/src/core/report/sections' },
  { script: 'check-category-labels.mjs', guardDir: 'apps/portal/modules/gacc' },
  { script: 'check-t-keys.mjs', guardDir: 'apps/portal/messages/en.json' },
  { script: 'check-colon-consistency.mjs', guardDir: 'apps/portal/messages' },

  // ── 输出检查（需先编译，仅在传 --out-dir 时生效） ────────
  { script: 'check-hreflang.mjs', output: true },
  { script: 'check-llms.mjs', output: true },
  { script: 'check-seo-output.mjs', output: true },
  { script: 'clean-rsc.mjs', output: true },

  // ── 类型检查 ────────────────────────────────────────
  { script: 'tsc --noEmit', type: 'tsc' },
];

// ============================================================
// 单个项目的检查流程
// ============================================================
function runChecksForProject(p, skipSync) {
  _currentProject = p;
  const CWD = getCwd(p);

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  CI 检查 — ${p.toUpperCase()}`);
  console.log(`  out-dir: ${outDir || '(无)'}  sync: ${doSync && !skipSync ? '是' : '否'}`);
  console.log(`═══════════════════════════════════════════════\n`);

  // 翻译同步（只跑一次）
  if (doSync && !skipSync) runSync();

  for (const check of CHECK_LIST) {
    // Guard dir: 检查所需数据目录是否存在
    if (check.guardDir && !repoDirExists(check.guardDir)) {
      console.log(`  ∎ ${check.script} → ∅ 不适用（无 ${check.guardDir}）`);
      continue;
    }

    // Output check: 只在传了 --out-dir 时运行
    if (check.output && !outDir && !nextDir) continue;

    // hreflang: 每个项目传不同 out-dir
    if (check.script === 'check-hreflang.mjs') {
      if (!outDir) continue;
      runScript(p, check.script, CWD, `--dir=${outDir}`, '--skip-pattern=404,_not-found');
      continue;
    }

    // llms：只在有 llms 文件时运行
    if (check.script === 'check-llms.mjs') {
      const llmsFullDir = path.resolve(CWD, llmsDir);
      const hasLlmsFiles = fs.existsSync(llmsFullDir) && fs.readdirSync(llmsFullDir).some(f => /^llms-/.test(f));
      if (!hasLlmsFiles) {
        console.log(`  ∎ check-llms.mjs → ∅ 无 llms 文件`);
        continue;
      }
      runScript(p, check.script, CWD, `--dir=${llmsDir}`);
      continue;
    }

    // seo-output
    if (check.script === 'check-seo-output.mjs') {
      if (!outDir) continue;
      runScript(p, check.script, CWD, `--out-dir=${outDir}`);
      continue;
    }

    // clean-rsc
    if (check.script === 'clean-rsc.mjs') {
      if (!outDir) continue;
      runScript(p, check.script, CWD, outDir);
      continue;
    }

    // tsc --noEmit：类型检查
    if (check.type === 'tsc') {
      if (!fs.existsSync(path.join(CWD, 'tsconfig.json'))) {
        console.log(`  ∎ tsc --noEmit → ∅ 无 tsconfig.json`);
        continue;
      }
      console.log(`\n▶ tsc --noEmit`);
      const tscResult = spawnSync('npx', ['tsc', '--noEmit'], {
        cwd: CWD,
        stdio: 'inherit',
        shell: true,
        timeout: 300000,
      });
      if (tscResult.status !== 0) {
        totalFailures += tscResult.status ?? 1;
        if (_currentProject) {
          if (!failureDetails[_currentProject]) failureDetails[_currentProject] = [];
          failureDetails[_currentProject].push({ script: 'tsc --noEmit', status: tscResult.status ?? 1 });
        }
      }
      continue;
    }

    // 普通检查：直接调用
    const checkArgs = check.args || [];
    runScript(p, check.script, CWD, ...checkArgs);
  }
}

// ============================================================
// 失败明细表
// ============================================================
function printFailureTable() {
  const projects = Object.keys(failureDetails).filter(p => failureDetails[p].length > 0);
  if (projects.length === 0) return;

  const rows = [];
  let maxProjLen = 4;
  let maxScriptsLen = 5;
  for (const proj of projects) {
    const scripts = failureDetails[proj].map(f => f.script).join(', ');
    const count = failureDetails[proj].length.toString();
    rows.push({ proj, scripts, count });
    if (proj.length > maxProjLen) maxProjLen = proj.length;
    if (scripts.length > maxScriptsLen) maxScriptsLen = scripts.length;
  }

  const line = `┌${'─'.repeat(maxProjLen + 2)}┬${'─'.repeat(Math.min(maxScriptsLen, 60) + 2)}┬${'─'.repeat(7)}┐`;
  const sep = `├${'─'.repeat(maxProjLen + 2)}┼${'─'.repeat(Math.min(maxScriptsLen, 60) + 2)}┼${'─'.repeat(7)}┤`;
  const end = `└${'─'.repeat(maxProjLen + 2)}┴${'─'.repeat(Math.min(maxScriptsLen, 60) + 2)}┴${'─'.repeat(7)}┘`;

  console.log(line);
  console.log(`│ ${'项目'.padEnd(maxProjLen)} │ ${'失败的脚本'.padEnd(Math.min(maxScriptsLen, 60))} │ 项数   │`);
  console.log(sep);
  for (const r of rows) {
    const scripts = r.scripts.length > 60 ? r.scripts.slice(0, 57) + '...' : r.scripts;
    console.log(`│ ${r.proj.padEnd(maxProjLen)} │ ${scripts.padEnd(Math.min(maxScriptsLen, 60))} │ ${r.count.padStart(5)} │`);
  }
  console.log(end);
}

// ============================================================
// Main
// ============================================================
if (!ALL_PROJECTS.includes(project)) {
  console.error(`❌ 未知项目: ${project}，必须为 ${ALL_PROJECTS.join(' / ')}`);
  process.exit(1);
}

if (runAll) {
  const availableProjects = ALL_PROJECTS.filter(p => {
    const dir = PROJECT_DIRS[p];
    return dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  });
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  🔍 自动发现子站: ${availableProjects.join(', ')}`);
  console.log(`═══════════════════════════════════════════════\n`);
  if (doSync) runSync();
  for (const p of availableProjects) runChecksForProject(p, true);
} else {
  runChecksForProject(project, false);
}

console.log(`\n═══════════════════════════════════════════════`);
if (totalFailures > 0) {
  printFailureTable();
  console.log(`❌ 共 ${totalFailures} 项检查失败`);
  if (isCi) process.exit(1);
} else {
  console.log(`✅ 全部检查通过`);
}
console.log(`═══════════════════════════════════════════════\n`);
