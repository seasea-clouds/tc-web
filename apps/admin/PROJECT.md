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
- ✅ 用户管理（列表/搜索/分页/启用禁用）
- ✅ 订阅管理（列表/手动修改状态/手动添加订阅）
- ✅ 报告管理（列表/模块筛选/状态筛选）
- ✅ 操作日志（搜索/日期筛选/类型筛选/详情展开）
- ✅ 支付与订单（列表/搜索/状态筛选/退款操作）
- ✅ 页面浏览量分析（D1 自建 page_views 表 + 异步跟踪 + 管理端分析看板）

## 技术栈
- Next.js 16 + TypeScript + Tailwind CSS
- Cloudflare Pages Functions (API)
- D1 Database (共享 Portal 的 D1)
- Recharts + D1 自建分析

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
| D1 binding | `DB`（共享 Portal 的 D1 数据库） |
| 访问方式 | 直接访问或通过主站 `sinotradecompliance.com/admin/*`|

## 待完成
- ⏳ Creem 回调集成（Webhook 写入 payments 表）
- ⏳ 数据看板 — 导出功能（CSV）
- ⏳ 邮件通知系统

## 技术决策
- ~~CF Analytics (GraphQL) 集成~~ → 改用 D1 自建 page_views 表（CF API Token 无 analytics:read 权限）
- 页面浏览量通过主站 _middleware.ts 异步 fire-and-forget 跟踪，零延迟影响
