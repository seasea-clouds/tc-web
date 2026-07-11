# Admin 管理后台 — SinoTrade Compliance

## 定位
内部运营管理面板，供管理团队使用。

## 状态
- ✅ 基础搭建完成（Next.js 16 + Tailwind CSS + CF Pages Functions/D1）
- ✅ 管理员登录（独立用户体系 + CF Turnstile 人机验证）
- ✅ 数据看板（统计概览 + PV/UV/地域/热门页面 + Recharts 图表）
  - 每日 PV/UV 趋势图（柱状图/折线图）
  - 地域分布（饼图 + 国家数统计）
  - 热门页面排行
  - 每日报告/用户趋势图
  - 报告模块分布 + 支付状态分布（饼图）
- ✅ 用户管理（列表/搜索/分页/启用禁用 + 详情面板含报告/订阅记录）
- ✅ 订阅管理（列表/手动修改状态/手动添加订阅 + 详情面板含支付记录）
- ✅ 报告管理（列表/模块筛选/状态筛选 + 详情面板含输入数据/评估结果/Next Steps）
- ✅ 操作日志（搜索/日期筛选/类型筛选/详情展开）
- ✅ 支付与订单（列表/搜索/状态筛选/退款操作 + 收入概览含今日/本月/累计 + 月度趋势图）
- ✅ 页面浏览量分析（CF Analytics GraphQL + D1 缓存 → 管理端分析看板）
- ✅ Creem 回调集成（Webhook 写入 payments 表，更新报告支付状态）

## 与策划文档的差异
文档参考「Admin 管理后台 — 完整策划方案」（飞书文档）。
- ✅ 数据看板：CF Analytics GraphQL + D1 缓存（PV/UV/地域/浏览器/路径/OS/设备/项目分布）
- ✅ 渠道来源分布（Direct/Search/Social/Internal/Referral 饼图）
- ✅ 站点来源分布（site/portal/blog/admin 饼图）
- ✅ 每小时趋势（今日：实际值；7天/30天：日均每小时平均值）
- ❌ 用户平均停留时长（D1 无前端计时数据，需改前端代码）
- ❌ PDF 下载（R2 存储未配置）

## 技术栈
- Next.js 16 + TypeScript + Tailwind CSS
- Cloudflare Pages Functions (API)
- D1 Database（共享 Portal 的 D1）
- CF Analytics GraphQL API + D1 缓存（PV/UV/地域/浏览器/路径等数据）
- Recharts

## 路由结构
```
/{locale}/admin/（通过主站 Worker 代理）
├── login         — 管理员登录
├── dashboard     — 数据看板（默认首页）
├── users         — 用户管理
├── subscriptions — 订阅管理
├── reports       — 报告管理
├── logs          — 操作日志
└── payments      — 支付与订单
```

## 部署

➡️ 详见 [SOP.md](./SOP.md)

| 项目 | 值 |
|------|------|
| CF Pages 项目 | `trade-web-admin` |
| 域名 | `https://trade-web-admin.pages.dev` |
| Root dir | `apps/admin` |
| 构建 | GitHub 自动触发（CF Pages 原生构建） |
| 构建触发器 | `['*']`（因具体路径导致 Runner 忽略构建，已回退） |
| D1 binding | `DB`（共享 Portal 的 D1 数据库） |
| 环境变量 | `ADMIN_JWT_SECRET`, `TURNSTILE_SECRET_KEY`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` |
| 访问方式 | 直接访问或通过主站 `sinotradecompliance.com/admin/*`|

## 技术决策
- CF Analytics GraphQL + D1 缓存（cf-analytics.ts 库封装 GraphQL 查询，d1-cache.ts 管理 D1 缓存层）
  - `fetchDailyStats()` — PV/UV/国家/浏览器/状态码
  - `fetchHourlyStats()` — 每小时 PV/UV
  - `fetchAggregateStatsRange()` — 路径/OS/设备/项目分布
- **缓存策略**：历史数据缓存到 D1 的 `daily_page_stats` 和 `hourly_page_stats` 表
  - 每日数据：从 CF 取一次后永久缓存，不再重复查询
  - 每小时数据（今日）：已完成的小时自动回填缓存
  - 首次请求自动回填全部历史数据，后续只补充新增部分
- 环境变量 `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN`（需 `analytics:read` 权限）需在 CF Pages 面板配置
- 详情页改用内联面板（非独立 [id] 路由），兼容 Next.js static export
- Build 命令：`npm run build`（= `next build && postbuild.sh`），postbuild.sh 负责将导出文件移到 /admin/ 子目录
