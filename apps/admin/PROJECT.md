# Admin 管理后台 — SinoTrade Compliance

## 定位
内部运营管理面板，供管理团队使用。

## 状态
- ✅ 基础搭建完成（Next.js 16 + Tailwind CSS + CF Pages Functions/D1）
- ✅ 管理员登录（独立用户体系 + CF Turnstile 人机验证）
- ✅ 数据看板（统计概览 + 时间范围选择 + Recharts 图表）
  - 每日报告/用户趋势图（柱状图/折线图）
  - 报告模块分布（饼图）
  - 支付状态分布（饼图）
  - D1 实时数据，待集成 CF Analytics (PV/UV/渠道/地域)
- ✅ 用户管理（列表/搜索/分页/启用禁用）
- ✅ 订阅管理（列表/手动修改状态/手动添加订阅）
- ✅ 报告管理（列表/模块筛选/状态筛选）
- ✅ 操作日志（搜索/日期筛选/类型筛选/详情展开）
- ⏳ 支付与订单（P1 — 待开发）

## 技术栈
- Next.js 16 + TypeScript + Tailwind CSS
- Cloudflare Pages Functions (API)
- D1 Database (共享 Portal 的 DB)
- Recharts + CF Analytics (看板图表，待集成)

## 路由结构
```
/{locale}/admin/（通过主站 Worker 代理）
├── login         — 管理员登录
├── dashboard     — 数据看板（默认首页）
├── users         — 用户管理
├── subscriptions — 订阅管理
├── reports       — 报告管理
├── logs          — 操作日志
└── payments      — 支付与订单（P1）
```

## 部署
- CF Pages 项目: `trade-web-admin`
- 域名: `https://trade-web-admin.pages.dev`
- Root dir: `apps/admin`
- Build: `npx next build` + `wrangler pages deploy`（直接上传替代自动构建）
- D1 binding: `DB` (共享 Portal 的 D1 数据库)
- 访问方式：直接访问 `trade-web-admin.pages.dev`（无需通过主站代理）

### 自动构建问题
CF Pages 自动构建（从 GitHub 触发）持续失败，原因不明（`clone_repo` 成功但 `build` 阶段失败且无可用日志）。
当前通过 `wrangler pages deploy` 直接上传部署。

### 待完成
- CF Pages 后台添加 `TURNSTILE_SECRET_KEY` 环境变量（与 Portal 项目同值）
- CF Analytics (GraphQL) 集成获取实时 PV/UV/渠道/地域数据
- CF Pages 自动构建修复

### 坑
- 移动 `functions/api/auth/*` 到 `functions/api/admin/auth/*` 后，必须更新 import 路径：
  `../../lib/admin-session` → `../../../lib/admin-session`（多一级目录）
- 更新 `package.json` 依赖后必须更新 `package-lock.json`，否则 `npm ci` 在 CF Pages 上会失败
- Turnstile script 必须通过 JS 动态加载（`document.createElement('script')`），放在 `<head>` 的 `<script>` 标签在 Next.js RSC 渲染中会被忽略
