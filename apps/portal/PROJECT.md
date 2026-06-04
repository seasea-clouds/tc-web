# Portal — 合规自查用户站

> **目录：** `apps/portal/`
> **GitHub：** `seasea-clouds/trade-web`（Root: `apps/portal`）
> **CF Pages 项目名：** `trade-web-portal`
> **dev 域名：** `https://trade-web-portal.pages.dev`
> **主站代理路径：** `/{locale}/c/*`
> **旧名/路径：** 曾用名 "compli-service"，旧前缀 `/compli-service/`，**已全面停用**

## 定位

Portal 是 **SinoTrade Compliance 主站的获客-教育-转化漏斗第一步**，不是一个独立产品。

```
用户旅程：
  免费自查 ($0)  →  付费报告 ($1)  →  联系专家 ($500+)
  ─────────────     ───────────      ────────────────
  获客入口           教育转化          商业转化（主站套餐）
```

## 六大自查模块

| 模块 | 路由（经主站） | 说明 |
|------|---------------|------|
| GACC 食品注册 | `/en/c/check/gacc` | 食品出口中国合规自查 |
| 中文标签合规 | `/en/c/check/label` | 中文标签合规自查 |
| CCC 认证 | `/en/c/check/ccc` | 中国强制认证自查 |
| 化妆品备案 | `/en/c/check/nmpa` | NMPA 备案自查 |
| 跨境电商 | `/en/c/check/crossborder` | 跨境电商合规自查 |
| 品牌保护 | `/en/c/check/trademark` | 商标保护自查 |

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 `output: 'export'`（SSG）+ TypeScript |
| 样式 | Tailwind CSS v4 |
| 多语言 | next-intl + `[locale]` 路由，48 语言 SSG |
| API | Pages Functions（`functions/api/`）|
| 数据库 | Cloudflare D1（SQLite）|
| 认证 | httpOnly Cookie Session |
| 支付 | Creem |
| 邮件 | Resend |

## 核心规则

| 规则 | 说明 |
|------|------|
| ✅ 品牌一致 | 页头页脚与主站完全一致（`@trade/ui` 共享组件）|
| ✅ 48 语言 | 48 语言框架已搭建（next-intl）|
| ✅ 漏斗定位 | 不自称独立产品，报告末尾引导"联系专家"|
| ✅ 免费自查 | 免登录，任何访客可用 |
| ✅ 工具注册表 | `src/data/tools.ts` 驱动首页渲染 |

## 页面路由

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/en/c/` | 6 工具入口 |
| GACC 自查 | `/en/c/check/gacc` | 表单 + 免费结果 + 付费报告 |
| 标签自查 | `/en/c/check/label` | 同上 |
| CCC 自查 | `/en/c/check/ccc` | 同上 |
| 化妆品自查 | `/en/c/check/nmpa` | 同上 |
| 跨境自查 | `/en/c/check/crossborder` | 同上 |
| 品牌保护 | `/en/c/check/trademark` | 同上 |
| 报告页 | `/en/c/report?id=xxx` | 完整报告 |
| 登录 | `/en/c/auth/login` | |
| 注册 | `/en/c/auth/register` | |
| 仪表盘 | `/en/c/dashboard` | 需登录 |
| 历史报告 | `/en/c/dashboard/reports` | 需登录 |
| 订阅管理 | `/en/c/dashboard/billing` | 需登录 |

**注意：** 所有路由通过主站代理访问时使用 `/{locale}/c/...` 格式。
访问 portal 站独立域名时：`https://trade-web-portal.pages.dev/en/c/...`

## 翻译（i18n）

- **当前状态：** Check 命名空间下部分中文字段未翻译（绝大部分 key 仍为英文原文 fallback）
- **翻译文件：** `apps/portal/messages/*.json`
- **硬编码英文：** 6 个 check-client.tsx 中大量英文文本（label/placeholder/h1/title）未使用 `t()` 翻译函数
- **流水线检查：** `check-hardcoded.mjs` 和 `check-translations.mjs` 每次构建时运行，但因为策略问题未覆盖到这些问题

## 部署

- **构建命令：** `npx next build`
- **输出目录：** `out/`
- **构建流水线：** `build` 脚本含 `check-hardcoded --ci` 和 `check-translations --short`
- **部署命令：** `npx wrangler pages deploy ./out --project-name=trade-web-portal`

## 环境变量

CF Pages 已配置（`~/.openclaw/.env`）：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥 |
| `CREEM_API_KEY` | Creem 支付密钥 |
| `CREEM_PRODUCT_ID_SINGLE` | 单次报告产品 ID |
| `CREEM_PRODUCT_ID_SUBSCRIBE` | 订阅产品 ID |
| `RESEND_API_KEY` | 邮件服务密钥 |
| `EMAIL_FROM` | 发件人地址 |
| `NODE_VERSION` | `22` |

## 文档

| 文件 | 用途 |
|------|------|
| [GOAL.md](GOAL.md) | 项目目标与规则 |
| [TASK.md](TASK.md) | 任务清单 |
| [NOTES.md](NOTES.md) | 技术决策 & 踩坑 |
| [SOP.md](SOP.md) | 操作流程 |
