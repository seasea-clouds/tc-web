# Admin NOTES — 技术决策与注意事项

## 技术决策

### Proxy 架构
- Admin 运营后台通过主站 `_middleware.ts` 代理访问（`/admin/*` → `trade-web-admin.pages.dev`）
- API 路径 `/api/admin/*` 同样通过 `proxyFetch()` 代理（已修复：之前裸 `fetch()` 默认 GET，POST 请求返回 405）

### D1 数据库
- 共享 Portal 项目的 D1 数据库（binding name: `DB`）
- Admin 使用独立的 D1 表（`admin_users`, `admin_logs` 等），不与 Portal 用户数据冲突

### Turnstile 人机验证
- Admin 使用独立 Turnstile widget，site key: `0x4AAAAAADqoEtL5oqrpaf3R`
- 与 Portal 的 Turnstile 不同（Portal 用的是另一个 widget）
- `TURNSTILE_SECRET_KEY` 环境变量已通过 wrangler 配置

### 静态导出
- `output: 'export'` + `basePath: '/admin'`，产出到 `out/admin/` 目录
- CF Pages Functions 负责 API 路由（不在 Next.js 路由系统中）

## 踩坑记录

### import 路径
移动 `functions/api/auth/*` → `functions/api/admin/auth/*` 后，import 路径需多一层：
`../../lib/admin-session` → `../../../lib/admin-session`

### package-lock.json
更新依赖后必须重新生成 `package-lock.json`，否则 CF Pages 的 `npm ci` 会失败。

### Turnstile 脚本加载
Turnstile script 不能放在 `<head>` 的 `<script>` 标签中（Next.js RSC 渲染忽略），必须通过 `document.createElement('script')` 动态加载。

### ~~CF Pages 自动构建故障~~ 已修复
GitHub 推送触发的自动构建持续失败（`clone_repo` 成功但 `build` 阶段报错，队列不调度）。

**根因：** GitHub webhook 未正确激活。通过 CF API toggle `deployments_enabled` false → true 修复。
现在自动构建正常运作。

`functions/` 目录仅在 wrangler 部署时生效，`next build` 会把它当作页面文件，但不影响部署。

### _routes.ts 死代码
`functions/api/admin/auth/_routes.ts` 把 `onRequest` 重命名为 `loginHandler` 等，导致 CF Pages Functions 路由匹配失败。已删除（由独立函数文件按路径匹配）。

### 详情页实现策略（2026-07-05）
- 文档要求 `/admin/users/[id]`、`/admin/subscriptions/[id]`、`/admin/reports/[id]` 独立详情页
- 但 Next.js `output: 'export'` 模式下动态路由 `[id]` 无法预渲染
- 改用**内联详情面板**：点击列表行展开面板（类似模态框/抽屉），展示完整详情
- 数据通过 CF Pages Functions API 获取：
  - `GET /api/admin/reports/:id` — 返回完整报告数据（含 `input_data`、`result_data` 解析）
  - `GET /api/admin/users/:id` — 返回用户详情 + 报告列表 + 订阅记录
  - `GET /api/admin/subscriptions/:id` — 返回订阅详情 + 支付历史
  - `GET /api/admin/payments/summary` — 返回收入汇总（今日/月/总 + 月度趋势）

### 构建触发器路径限制（2026-07-05 — 已回退）
- 文档建议仅 `apps/admin/**`、`packages/ui/**`、`packages/scripts/**` 触发构建
- 之前设置为 `['*']`（所有项目变更均触发 Admin 构建）
- 已通过 CF API 更新为精确路径列表
- 但设置后**构建 Runner 忽略 Admin 的所有构建**（卡在 `queued/idle`），回退到 `['*']` 后恢复
- ⚠️ CF Pages 免费版对 `path_includes` 的非通配符支持有问题，暂维持 `['*']`

### 分析系统 — D1 自建方案（2026-07-05）
- 原计划集成 CF Analytics GraphQL API，但现有 CF API Token 缺乏 `analytics:read` 权限
- 改用 **D1 自建 page_views 表**：
  - 优势：实时数据、无延迟、无 API 调用限制、可交叉查询
- 跟踪机制：
  - 主站 `_middleware.ts` 添加异步 fire-and-forget（`context.waitUntil`）
  - 仅跟踪 GET + text/html 页面加载，排除静��资源/CSS/JS/API
  - 请求代理到 admin 的 `/api/admin/track` 端点，写入 D1
- 管理看板：新增 PV/UV 趋势 + 地域分布 + 热门页面排行
- 部署后自动开始采集，无需额外配置
