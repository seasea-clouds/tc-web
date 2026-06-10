#!/usr/bin/env node
/**
 * ci-check.mjs — 统一 CI 检查入口
 *
 * 三个站点（site / portal / blog）共享此脚本，不再各自维护独立的构建管线检查。
 * 所有检查脚本统一在 packages/scripts/ 中，此脚本负责按项目参数精确调度。
 *
 * 用法：
 *   # Site（SSG 全量输出，直接托管）
 *   node ci-check.mjs --project=site --out-dir=out --ci
 *
 *   # Portal（SSG 输出，Worker 边缘路由 /c/）
 *   node ci-check.mjs --project=portal --out-dir=out --ci
 *
 *   # Blog（Next.js .next 输出）
 *   node ci-check.mjs --project=blog --next-dir=.next --ci
 *
 * 项目参数决定了行为差异：
 *   - hreflang 检查模式（--dir / --skip-pattern / --next-dir）
 *   - 哪些目录检查 hardcoded
 *   - 哪些路径进入 llms.txt / seo-output 检查
 *   - translations 检查是否跳过 locale consistency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname);
const REPO_ROOT = path.resolve(__dirname, '../..');

// ============================================================
// 参数解析
// ============================================================
const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const project = (() => {
  const a = args.find(x => x.startsWith('--project='));
  return a ? a.split('=')[1] : 'site';
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

if (!['site', 'portal', 'blog'].includes(project)) {
  console.error(`❌ 未知项目: ${project}，必须为 site / portal / blog`);
  process.exit(1);
}

// ============================================================
// 工具
// ============================================================
let totalFailures = 0;

// 项目工作目录（各脚本使用相对路径引用项目的 out/ / .next/ / messages/ 目录）
const PROJECT_DIRS = {
  site: path.join(REPO_ROOT, 'apps/site'),
  portal: path.join(REPO_ROOT, 'apps/portal'),
  blog: path.join(REPO_ROOT, 'apps/blog'),
};
const CWD = PROJECT_DIRS[project];

function runScript(scriptName, ...extraArgs) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.log(`  ⚠️ 脚本不存在: ${scriptName}，跳过`);
    return;
  }

  const scriptArgs = [...extraArgs];
  // clean-rsc 不支持 --ci，仅接受目录路径参数
  if (isCi && scriptName !== 'clean-rsc.js') scriptArgs.push('--ci');

  console.log(`\n▶ ${scriptName} ${scriptArgs.join(' ')}`);

  const result = spawnSync('node', [scriptPath, ...scriptArgs], {
    cwd: CWD,
    stdio: 'inherit',
    shell: true,
    timeout: 300000,
  });

  if (result.status !== 0) {
    totalFailures += result.status ?? 1;
  }
  return result.status;
}

function runLocalScript(name, ...args) {
  return runScript(name, ...args);
}

// ============================================================
// 构建阶段检查（所有项目共享）
// ============================================================
function runBuildPhaseChecks() {
  let checks = [
    ['check-seo-patterns.mjs'],
    ['check-hardcoded-domain.mjs'],
    ['check-hardcoded.mjs'],
    ['check-console.mjs'],
    ['check-rtl.mjs'],
    ['check-map-key.mjs'],
    ['check-jsonld.mjs'],
  ];

  for (const [script, ...extra] of checks) {
    runLocalScript(script, ...extra);
  }
}

// ============================================================
// SSG 输出检查（构建后运行）
// ============================================================
function runOutputPhaseChecks() {
  // hreflang 检查 — 项目间差异最大，精确参数化
  if (project === 'site') {
    runLocalScript('check-hreflang.mjs', `--dir=${outDir}`);
  } else if (project === 'portal') {
    // Portal 的 /c/ 路径由主站 Worker 在边缘端注入 hreflang
    // SSG 输出中这些路径不含 hreflang，精确跳过
    runLocalScript('check-hreflang.mjs', `--dir=${outDir}`, '--skip-pattern=/c/,404,_not-found');
  } else if (project === 'blog') {
    runLocalScript('check-hreflang.mjs', `--next-dir=${nextDir}`);
  }

  // llms.txt 检查 — 所有项目都该检查（如果该目录下有 llms 文件）
  const llmsFullDir = path.resolve(CWD, llmsDir);
  const hasLlmsFiles = fs.existsSync(llmsFullDir) && fs.readdirSync(llmsFullDir).some(f => /^llms-/.test(f));
  if (hasLlmsFiles) {
    runLocalScript('check-llms.mjs', `--dir=${llmsDir}`);
  }

  // seo-output 检查 — 所有项目都该检查
  if (outDir) {
    runLocalScript('check-seo-output.mjs', `--out-dir=${outDir}`);
  }
}

// ============================================================
// 翻译检查
// ============================================================
function runTranslationChecks() {
  const extra = [];
  // Portal messages 是独立文件，需要检查但跳过 locale consistency
  if (project === 'portal') {
    extra.push('--skip-locale-check');
  }
  runLocalScript('check-translations.mjs', '--short', ...extra);
}

// ============================================================
// 清理
// ============================================================
function runCleanup() {
  if (outDir) {
    runLocalScript('clean-rsc.js', outDir);
  }
}

// ============================================================
// Main
// ============================================================
console.log(`\n═══════════════════════════════════════════════`);
console.log(`  CI 统一检查 — ${project.toUpperCase()}`);
console.log(`  out-dir: ${outDir || '(none)'}  next-dir: ${nextDir || '(none)'}`);
console.log(`═══════════════════════════════════════════════\n`);

runBuildPhaseChecks();

if (outDir || nextDir) {
  runOutputPhaseChecks();
}

runTranslationChecks();
runCleanup();

console.log(`\n═══════════════════════════════════════════════`);
if (totalFailures > 0) {
  console.log(`❌ 共 ${totalFailures} 项检查失败`);
  if (isCi) process.exit(1);
} else {
  console.log(`✅ 全部检查通过`);
}
console.log(`═══════════════════════════════════════════════\n`);
