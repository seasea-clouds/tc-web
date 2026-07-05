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

➡️ 详见 [SOP.md](./SOP.md)

| 项目 | 值 |
|------|------|
| CF Pages 项目 | `trade-web-admin` |
| 域名 | `https://trade-web-admin.pages.dev` |
| Root dir | `apps/admin` |
| 构建 | 手动 `npx next build` → `wrangler pages deploy` |
| D1 binding | `DB`（共享 Portal 的 D1 数据库） |
| 访问方式 | 直接访问 `trade-web-admin.pages.dev` 或通过主站 `sinotradecompliance.com/admin/*`|

## 待完成
- ⏳ `TURNSTILE_SECRET_KEY` 环境变量 — 需从 CF Dashboard → Turnstile 获取 site key `0x4AAAAAAAewC-TLy6pJ7WgB` 对应的 secret key，配置到 Pages 项目环境变量中
- ⏳ CF Analytics (GraphQL) 集成
- ⏳ CF Pages 自动构建修复
- ⏳ 支付与订单（P1 — 待开发）

## 踩坑记录
详见 [NOTES.md](./NOTES.md)
