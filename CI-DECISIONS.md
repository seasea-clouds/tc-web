# CI Pipeline 决策记录

## 核心原则（2026-06-10，用户明确要求）
1. **所有检测脚本统一共享一套（ci-check.mjs）**，不各自维护。
2. **不得降低检测强度或缩小范围**。遇到不适合检测的场景，在共享脚本中添加精确特殊处理，而非绕过或移除。
3. **检测出的问题必须修复**，不是掩盖。

## Portal hreflang — 跳过 914 文件原因
Portal SSG 输出 914 个 HTML 文件：
- 912 个在 `/c/` 路径下（48语言 × 各子页面）
- 2 个不在（`404/`, `_not-found/`）

**跳过原因**：Portal 的 locale 路由和 hreflang `<link>` 标签不是由 SSG 生成的，而是由主站 Cloudflare Worker（apps/site/functions/_middleware.ts）在边缘端注入。SSG 静态 HTML 中 `/c/` 路径本就不含 hreflang。

所以：
- 构建时：`--skip-pattern=/c/,404,_not-found` — 精确跳过 Worker 路由的路径
- 部署后：`--url=https://sinotradecompliance.com/en/c/ --ci` — 远程验证 Worker 注入的 hreflang

**不是降级，是把检查时机从构建时移到部署后**（因为 Worker 注入只能在部署后验证）。

## 翻译检查按项目分流
ci-check.mjs 的 check-translations 按 --project 参数传递不同 flags：
- site: 全量（所有模块）
- portal: --skip-locale-check（portal 消息独立于 site）
- blog: --skip-industry-meta --skip-portal-check（blog 仅有 Blog+Cookie 命名空间）

## 消息文件层级
修复问题要覆盖三层：
- packages/ui/messages/（共享 UI：Footer/Navbar）
- apps/site/messages/（主站）
- apps/portal/messages/（用户站）
- apps/blog/messages/（博客）
