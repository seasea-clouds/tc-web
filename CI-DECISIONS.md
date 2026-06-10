# CI Pipeline 记忆

## 2016-06-10 修复 Portal hreflang 与 hardcoded 检查设计

### 背景
Portal 构建流水线中 `check-hreflang.mjs --dir=out` 出现 914 项失败，原因如下：
- Portal SSG 输出的 HTML 不包含 hreflang `<link>` 标签
- Portal 的 locale 路由由主站 (`apps/site/functions/_middleware.ts`) 的 Cloudflare Worker 在边缘端处理
- 因此 `--dir=out` 模式检查 SSG 静态文件始终为零 hreflang，无法通过

### 解决方案
1. Portal 构建脚本：使用 `--url` 模式在**部署后**检查 hreflang：
   ```
   npm run postdeploy-check   # → check-hreflang.mjs --url=... --ci
   ```
2. build 管道中不再包含 `--dir=out` 模式的 hreflang 检查（它在此项目中语义错误）
3. `CI-RULES.md` 中明确记录了此设计决策及原因

### hardcoded 检查范围调整
- `check-hardcoded.mjs` 默认可遍历 `DIRS_TO_CHECK`（含 site/portal/blog/ui）
- Portal 构建中限定为其自身代码：`check-hardcoded.mjs --ci apps/portal/src apps/portal/modules`
- Site 和 Blog 构建各自运行全量扫描（它们也包含检查对方的问题）

### 关键教训
- 不要为了通过 CI 而移除检查脚本，应修正检查方式
- `--dir=out` vs `--url` vs `--next-dir` 三种模式适用于不同构建类型
- SSG + Worker 边缘路由的项目（portal），hreflang 必须用 `--url` 检查已部署实例
