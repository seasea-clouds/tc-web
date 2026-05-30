# Portal — 合规自查用户站

> **目录：** `apps/portal/`
> **GitHub：** `seasea-clouds/trade-web` (Root: `apps/portal`)
> **部署：** CF Pages → `compli-service.pages.dev`（主站 Worker 代理到 `/en/c/`）

## 用途

六大合规自查工具，面向海外出口商。

| 模块 | 路由 | 说明 |
|------|------|------|
| GACC 食品注册 | `/en/c/check/gacc` | 食品出口中国合规自查 |
| 标签合规 | `/en/c/check/label` | 中文标签合规自查 |
| CCC 认证 | `/en/c/check/ccc` | 中国强制认证自查 |
| 化妆品备案 | `/en/c/check/nmpa` | NMPA 备案自查 |
| 跨境电商 | `/en/c/check/crossborder` | 跨境电商合规自查 |
| 品牌保护 | `/en/c/check/trademark` | 商标保护自查 |

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 (SSG) + TypeScript |
| 样式 | Tailwind CSS v4 |
| 多语言 | next-intl + `[locale]` 路由，48 语言 |
| 数据库 | Cloudflare D1 (SQLite) |
| 认证 | httpOnly Cookie Session |
| 支付 | Creem（第一期）|
| 邮件 | Resend（第一期）|
| 部署 | Cloudflare Pages + Pages Functions |

## 文档

| 文件 | 用途 |
|------|------|
| [GOAL.md](GOAL.md) | 项目目标与规则 |
| [TASK.md](TASK.md) | 任务清单 |
| [NOTES.md](NOTES.md) | 技术决策 |
| [SOP.md](SOP.md) | 操作流程 |
