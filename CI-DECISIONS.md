# CI Pipeline 设计决策记录

## 决策原则
- 所有检测脚本**不得随意移除或简化**
- 检测出的问题必须**修复**，不能绕过或掩盖
- 遇到特殊场景，在检测脚本中添加"精确特殊处理"（如 skip patterns），而非缩小检测范围

## 各项目检测策略

### Portal (apps/portal) — trade-web-portal.pages.dev

#### check-hreflang
- Portal 是 SSG 静态导出，通过主站 Cloudflare Worker 边缘端代理到 `/c/` 路径
- 主站 Worker 在边缘端处理 locale 路由并注入 hreflang 标签
- Portal SSG 输出的 `/c/` 路径 HTML **不包含 hreflang**（这是正确的架构行为）
- **处理方式**：
  1. 构建中：`--dir=out --skip-pattern=/c/` — 检查 portal 的非 `/c/` 页面（如 404, _not-found 等）
  2. 部署后：`--url=https://sinotradecompliance.com/en/c/ --ci` — 通过远程请求验证 Worker 注入的 hreflang
- skip-pattern 参数在 `check-hreflang.mjs` 脚本中通过 `--skip-pattern` 实现
- 脚本头部注释中详细说明了各项目的检查模式选择

#### check-hardcoded
- Portal 的 check-hardcoded 默认扫描 `DIRS_TO_CHECK` 所有项目（site/portal/blog/ui）
- 如果 blog/site 代码中有硬编码英文，会在 portal 构建中被检测出来
- 正确的做法是：**修复 blog/site 的硬编码问题**，而不是限制 portal 的扫描范围
- 已修复：blog layout 中硬编码的 `metaTitle` 和 `metaDescription` 改用 `getTranslations`
