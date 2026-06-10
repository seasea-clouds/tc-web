# CI Pipeline 决策记录

## 核心原则（2026-06-10，用户明确要求）
1. **检测脚本要统一共享一套**，不要各自站点自己维护自己的脚本。
2. **不得降低检测强度和缩小范围**。遇到不适合检测的场景，在共享脚本中添加精确特殊处理（如 `--skip-pattern`），而非缩小 scope 或移除检查。
3. **检测出的问题必须修复**，不是掩盖。

## 统一入口脚本：`ci-check.mjs`
- 2026-06-10 创建，位于 `packages/scripts/ci-check.mjs`
- 三个项目（site / portal / blog）的 `package.json` 中 build 脚本统一调用此脚本
- 项目差异通过 `--project=site|portal|blog` 参数 + 脚本内部特殊处理
- 所有检查脚本（check-seo-patterns, check-hardcoded, check-hreflang 等）统一在此调度

## CI 检查全面覆盖
之前 JSON-LD 只扫描 site，llms.txt 只扫描 blog，map-key 只扫描部分。
`ci-check.mjs` 统一后：
- `check-jsonld.mjs` 扩展为扫描 apps/site/src + apps/portal/src + apps/blog/src + packages/ui/src
- `check-map-key.mjs` 已覆盖全部 4 个目录
- `check-llms.mjs` 按项目检测 llms.txt 文件存在性，存在则检查
- `check-seo-output.mjs` 对所有项目的 out/ 输出进行检查

## Portal hreflang 特殊处理
Portal SSG 输出中 `/c/` 路径不含 hreflang（主站 Worker 边缘端注入）。
通过 `--skip-pattern=/c/,404,_not-found` 在脚本层面精确跳过。
部署后用 `--url=https://sinotradecompliance.com/en/c/ --ci` 远程验证 Worker 注入的 hreflang。

## CI 管线结构
各项目构建脚本分为三阶段：
1. 预构建（build-search-index, search-translations, convert-webp 等）
2. 核心构建（next build, build-all/bundle）
3. 检查阶段 — **统一使用 ci-check.mjs**
