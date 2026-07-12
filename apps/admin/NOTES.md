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

### 数据分析 — CF Analytics GraphQL + D1 缓存
- CF GraphQL 直取历史数据，写入 D1 长期缓存
- 库文件：`functions/lib/cf-analytics.ts`（GraphQL 查询） + `functions/lib/d1-cache.ts`（D1 缓存层）
  - `fetchDailyStats()` — httpRequests1dGroups：PV/UV/国家/浏览器/状态码
  - `fetchHourlyStats()` — httpRequests1hGroups：每小时 PV/UV
  - `fetchAggregateStatsRange()` — httpRequestsAdaptiveGroups：路径/OS/设备/项目分布（每日期并发，5 路并行）
- **缓存策略**：
  - 每日数据（`daily_page_stats` 表）：历史日期的数据不可变，从 CF 取一次后永久缓存
  - 每小时数据（`hourly_page_stats` 表）：今日完成的 UTC 小时逐步缓存，不缓存未完成的小时
  - 第一次请求：自动回填所有历史数据（从 2026-06-01 至今）
  - 后续请求：只补充未缓存的新数据（如新的一天或新完成的小时）
- API 端点：`GET /api/admin/analytics?range=today|7d|30d`（支持自定义 `start_date`/`end_date`）
- **定时回填**：
  - ~~`functions/_scheduled.ts`（Pages Function，cron: 0 * * * * UTC）~~
  - ⚠️ CF Pages 构建流水线**不会**从 `_scheduled.ts` 的 `config.schedule` 导出中可靠提取 cron schedule
  - 改用独立 Worker：`workers/analytics-cron/`（standalone Worker，`wrangler deploy`）
    - 路径：`apps/admin/workers/analytics-cron/`
    - 部署命令：`cd apps/admin/workers/analytics-cron && npx wrangler deploy`
    - cron: `0 * * * *` UTC
    - D1 绑定 + `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` secrets（通过 `wrangler secret put` 设置）
  - `_scheduled.ts` 保留在 Pages 项目中作为 fallback/冗余触发（idempotent，重复触发无害）
- 环境变量（CF Pages 中配置）：
  - `CLOUDFLARE_ZONE_ID` — sinotradecompliance.com 的 Zone ID
  - `CLOUDFLARE_API_TOKEN` — 需要 `analytics:read` 权限
- 注意：httpRequestsAdaptiveGroups 存在采样（~67%），图表数据为采样值
- 注意：uaBrowserFamily 和 clientRequestHTTPStatus 不是 httpRequestsAdaptiveGroups 的合法 dimensions
  → fetchDailyStats (httpRequests1dGroups) 支持 uaBrowserFamily
  → fetchAggregateStatsRange (httpRequestsAdaptiveGroups) 只能用 clientRequestPath/userAgentOS/clientDeviceType/date
  → browserData 走 Step 1 (httpRequests1dGroups)，不由 Step 2 覆盖
  → CF Free 不支持在 AdaptiveGroups 上按 clientRequestHTTPStatus 过滤或分维度
  → HTTP 200 过滤也无法在服务端做，因为该字段不是合法 dimension

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

### Standalone Worker — `_scheduled.ts` 踩坑（2026-07-12）

**背景：** Analytics cron 定时任务需要每小时同步 CF Analytics → D1。

**第一次尝试：** `functions/_scheduled.ts`（Pages Function，`config.schedule = "0 * * * *"`）
- 通过 git push → CF Pages 构建部署
- 构建成功（`uses_functions=True`），cron schedule 看似正确注册
- **问题：** 新版部署覆盖后，cron schedule **丢失**（08:00 和 09:00 UTC 均未触发）
- 回滚到旧版后 cron 恢复正常 → 确认新版部署未正确注册 schedule
- 换用 `wrangler pages deploy` 直接上传 → `fn=False`（函数未编译），更不可靠

**结论：** CF Pages 构建流水线无法可靠地从 `_scheduled.ts` 提取 cron schedule。

**最终方案：** 改用独立 Standalone Worker
```
apps/admin/workers/analytics-cron/
├── package.json
├── wrangler.toml      # triggers.crons = ["0 * * * *"]
└── src/index.ts       # 导出 scheduled handler
```
- `wrangler deploy` **始终**正确注册 cron schedule
- 代码与 `_scheduled.ts` 共享相同的 `functions/lib/` 库函数
- 部署仅需 3 秒，不经过 Pages 构建队列
- `_scheduled.ts` 保留为无副作用的冗余触发
- 代码提交到 GitHub 仓库备份，但部署永远用 `wrangler deploy`
- **踩坑：** `CLOUDFLARE_ZONE_ID` 在 `.env` 中为空 → `wrangler secret put` 设置了空值，导致 Worker 启动 `hasConfig()` 返回 false，cron 静默失败。修复：设置正确的 ZONE_ID 后重新 `wrangler secret put`。
- 修改代码流程：
  1. 修改 `src/index.ts` 或共享库文件
  2. `git add/commit/push`（备份到 GitHub）
  3. `cd apps/admin/workers/analytics-cron && npx wrangler deploy`（部署到生产）

## 环境变量管理（2026-07-12）

### 原则
每个 CF Pages 项目只注入它实际需要的最少环境变量。

### 各项目注入清单

| 项目 | 必要变量 | 说明 |
|------|---------|------|
| trade-web-admin | ADMIN_JWT_SECRET, TURNSTILE_SECRET_KEY | 登录认证 |
| trade-web-portal | CREEM_API_KEY, CREEM_PRODUCT_ID_SINGLE, CREEM_PRODUCT_ID_SUBSCRIBE, CREEM_WEBHOOK_SECRET, EMAIL_FROM, JWT_SECRET, RESEND_API_KEY, TURNSTILE_SECRET_KEY | 支付、邮件、认证 |
| trade-web-site | NODE_VERSION, UPSTREAM_BLOG, UPSTREAM_PORTAL, NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY | Edge Worker 代理 + 联系表单 |
| trade-web-blog | NODE_VERSION, NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY | 联系表单 |

### 本地开发
所有环境变量放在 `~/.openclaw/.env`。.env.example 在 monorepo 根目录，列出所有变量但不含实际值。

### 部署管控
- Cloudflare Dashboard 中的 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID 仅用于 analytics-cron 独立 Worker（通过 `wrangler secret put` 设置）
- 代码中已移除硬编码的 Web3Forms access_key，改用 `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` 环境变量注入
