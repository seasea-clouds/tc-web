# trade-web — SinoTrade 网站 Monorepo

> **新会话指引：** 读此文件了解网站项目全貌，然后按需读取子项目的 4 文件。
>
> **目录：** `/root/projects/trade/web/`
> **GitHub：** `seasea-clouds/trade-web`

## 项目定位

SinoTrade 品牌的所有网站代码统一放在此 monorepo 中。三个独立部署的 CF Pages 应用（site + portal + blog）共享同一套 UI 组件包，视觉完全一致，用户感觉不到跨站。

**非独立产品** — 是官网的获客-教育-转化漏斗的线上展示层。

## 三站架构概览

```
用户访问 → sinotradecompliance.com
              ├── /{locale}/...  → 主站自身 SSG 页面
              ├── /{locale}/c/...  → Worker 代理 → Portal
              └── /{locale}/blog/... → Worker 代理 → Blog
```

三站在 CF Pages 各自独立部署，通过主站的 `functions/_middleware.ts`（边缘 Worker）做代理转发。所有导航/页脚/语言切换由 `@trade/ui` 共享组件实现，用户感知上是一个完整的网站。

**当前阶段：** 已切换至正式域名 `sinotradecompliance.com`（2026-06-09）。三站通过 CF Pages 各自动部署，主站 Worker 统一代理门户和博客。

## 子项目

### 主站 — site
- **目录：** `apps/site/`
- **CF Pages 项目名：** `trade-web-site`
- **dev 域名：** `https://trade-web-site.pages.dev`
- **生产域名：** `sinotradecompliance.com` ✅
- **用途：** 官网主站，品牌展示、服务介绍、行业页面
- **技术栈：** Next.js 16 (SSG 静态导出) + next-intl + TypeScript + Tailwind CSS
- **多语言：** `[locale]` 服务端路由，48 语言 SSG（静态导出）
- **结构：** `src/`（页面组件）| `messages/`（48 语言翻译）| `content/blog/`（博客 MDX）| `public/`（静态资源）
- **SSG 输出目录：** `apps/site/out/`
- **代理功能：** `functions/_middleware.ts` 负责将 `/c/` → portal、`/blog/` → blog 的请求转发

### 用户站 — portal
- **目录：** `apps/portal/`
- **CF Pages 项目名：** `trade-web-portal`
- **dev 域名：** `https://trade-web-portal.pages.dev`
- **主站代理路径：** `/{locale}/c/*`
- **旧名：** 曾用 "compli-service"，已全面改为 "portal"；URL 前缀从 `/compli-service/` 改为 `/c/`。
- **用途：** 合规工具箱 — 6 大合规自查工具
- **技术栈：** Next.js 16 (`output: 'export'` SSG) + next-intl + TypeScript + Tailwind CSS + Pages Functions (API) + Cloudflare D1 (SQLite) + httpOnly Cookie Session + Creem (支付) + Resend (邮件)
- **API 目录：** `apps/portal/functions/api/`
- **六大自查模块：**
  | 模块 | 路由（经主站） | 说明 |
  |------|---------------|------|
  | GACC 食品注册 | `/en/c/check/gacc` | 食品出口中国合规自查 |
  | 中文标签合规 | `/en/c/check/label` | 中文标签合规自查 |
  | CCC 认证 | `/en/c/check/ccc` | 中国强制认证自查 |
  | 化妆品备案 | `/en/c/check/nmpa` | NMPA 备案自查 |
  | 跨境电商 | `/en/c/check/crossborder` | 跨境电商合规自查 |
  | 品牌保护 | `/en/c/check/trademark` | 商标保护自查 |
- **页面路由：**
  | 页面 | 路径 |
  |------|------|
  | 首页 | `/en/c/` |
  | 自查表单（6 模块） | `/en/c/check/{gacc,label,ccc,nmpa,crossborder,trademark}` |
  | 报告页 | `/en/c/report?id=xxx` |
  | 登录/注册 | `/en/c/auth/login` `/en/c/auth/register` |
  | 仪表盘/历史/订阅 | `/en/c/dashboard` `/en/c/dashboard/reports` `/en/c/dashboard/billing` |
- **翻译：** 48 语言全覆盖，CI 翻译质量检查 0 问题。翻译文件在 `apps/portal/messages/*.json`

### 博客站 — blog
- **目录：** `apps/blog/`
- **CF Pages 项目名：** `trade-web-blog`
- **dev 域名：** `https://trade-web-blog.pages.dev`
- **主站代理路径：** `sinotradecompliance.com/{locale}/blog/*`
- **用途：** SinoTrade Compliance 品牌的多语言合规博客，通过高质量教育内容获客
- **技术栈：** Next.js 16 (SSG) + next-intl + TypeScript + Tailwind CSS；内容：Markdown + gray-matter 前置元数据
- **多语言：** 48 语言，内容存放在 `content/{locale}/` 目录，每篇文章对应语言 Markdown 文件
- **搜索索引：** 通过 `packages/scripts/build-search-index.mjs` 统一生成，在主站 CDN 共享
- **共享 UI：** `@trade/ui`（Navbar/Footer/LanguageSwitcher）

### 管理后台 — admin
- **目录：** `apps/admin/`
- **CF Pages 项目名：** `trade-web-admin`
- **dev 域名：** `https://trade-web-admin.pages.dev`
- **主站代理路径：** `/{locale}/admin/*`（通过 `_middleware.ts` 代理）
- **用途：** 内部运营管理面板
- **路由结构：**
  | 页面 | 路径 |
  |------|------|
  | 登录 | `/{locale}/admin/login` |
  | 数据看板 | `/{locale}/admin/dashboard` |
  | 用户管理 | `/{locale}/admin/users` |
  | 订阅管理 | `/{locale}/admin/subscriptions` |
  | 报告管理 | `/{locale}/admin/reports` |
  | 操作日志 | `/{locale}/admin/logs` |
  | 支付与订单 | `/{locale}/admin/payments` |
- **功能状态：**
  - ✅ 管理员登录（独立用户体系 + CF Turnstile 人机验证）
  - ✅ 数据看板（PV/UV/地域/热门页面 + Recharts 图表 + CF Analytics GraphQL + D1 缓存）
  - ✅ 用户管理（列表/搜索/分页/启用禁用 + 独立详情页）
  - ✅ 订阅管理（列表/手动修改状态/手动添加 + 独立详情页）
  - ✅ 报告管理（列表/模块筛选/状态筛选 + 独立详情页）
  - ✅ 操作日志（搜索/日期筛选/类型筛选）
  - ✅ 支付与订单（列表/搜索/退款 + 收入概览 + 月度趋势图）
  - ✅ Creem 回调集成（Webhook 写入 payments 表）
- **技术栈：** Next.js 16 + TypeScript + Tailwind CSS + CF Pages Functions (API) + D1 Database + CF Analytics GraphQL + Recharts

### 共享组件 — ui
- **目录：** `packages/ui/`
- **用途：** 三站共享 UI（Navbar/Footer/LanguageSwitcher/CookieConsent/ActionDock/Theme tokens/SearchProvider）
- **关键文件：** `Navbar.tsx`, `Footer.tsx`, `LanguageSwitcher.tsx`, `CookieConsent.tsx`, `SearchProvider.tsx`, `constants.ts`, `theme.css`
- **版本：** 改一处，三站同步（通过 `transpilePackages` + tsconfig paths）

## 路由规则

| 站点 | 模式 | 示例 |
|------|------|------|
| 主站 | `/{locale}/...` | `/zh/services/gacc/` |
| Portal | `/{locale}/c/...` | `/zh/c/check/gacc` |
| Blog | `/{locale}/blog/...` | `/zh/blog/article-slug/` |
| Admin（未来） | `/{locale}/admin/...` | `/zh/admin/` |

Portal 不使用 `basePath`，Worker 代理透传完整路径。
共享组件用 `freeCheckHref` prop 决定 Free Check 按钮的跳转。

## 部署方式

### 独立 CF Pages 项目

| 项目 | CF Pages 项目名 | Root dir | Build cmd | Build output |
|------|----------------|----------|-----------|-------------|
| 主站 | `trade-web-site` | `apps/site` | `npx next build` | `out` |
| Portal | `trade-web-portal` | `apps/portal` | `npx next build` | `out` |
| Blog | `trade-web-blog` | `apps/blog` | `npx next build` | `out` |

**当前状态：** 已切换至正式域名 `sinotradecompliance.com`。`trade-web-site` 绑定主域名，portal 和 blog 通过主站 Worker 代理访问，无需直接绑定域名。
**Git 连接：** 三个项目都连接到 GitHub `seasea-clouds/trade-web` 仓库。
**自动部署：** push 到 `main` 分支触发所有项目构建。
- 改 `apps/site/**` → 触发主站
- 改 `apps/portal/**` → 触发 Portal
- 改 `apps/blog/**` → 触发博客
- 改 `packages/ui/**` 或 `packages/scripts/**` → 触发所有站

### 主站代理转发

主站 `functions/_middleware.ts`（边缘 Worker）处理：
1. `/{locale}/c/*` → 转发到 portal（保留 locale 前缀）
2. `/{locale}/blog/*` → 转发到 blog（保留 locale 前缀）
3. `/c/`（裸路径无 locale）→ 302 重定向到 `/{locale}/c/`（根据浏览器语言）
4. `/blog/`（裸路径无 locale）→ 302 重定向到 `/{locale}/blog/`
5. `/` 根路径 → 302 重定向到 `/{locale}/`（根据浏览器语言）
6. `/_next/static/` 在 HTML 中被重写为 `/c/_next/static/`（portal）和 `/blog/_next/static/`（blog）
7. `/api/*` → 转发到 portal 的 Pages Functions

### 共享 UI 组件

所有子站从 `@trade/ui` 包导入 Navbar/Footer/LanguageSwitcher 等：

```typescript
import Navbar from '@trade/ui/Navbar';
import Footer from '@trade/ui/Footer';
import { SearchProvider } from '@trade/ui';
```

路径映射在 `tsconfig.json`：
```json
{ "compilerOptions": { "paths": { "@trade/ui": ["../../packages/ui/src"] } } }
```

### Portal D1 配置

CF Dashboard → Workers & Pages → trade-web-portal → Settings → Functions → D1 database bindings
- Variable name: `DB`
- Database: 选择或创建 D1 数据库

## 共享知识

| 知识 | 位置 |
|------|------|
| 品牌色 Tailwind tokens | `packages/ui/src/theme.css` |
| 共享常量（WHATSAPP_URL 等） | `packages/ui/src/constants.ts` |
| Worker 代理规则 | `apps/site/functions/_middleware.ts` |
| 跨项目文档 | `/root/projects/trade/knowledge/` |

## 部署确认

| 项目 | 状态 | URL |
|------|------|-----|
| 官网 (site) | ✅ CI 通过 | https://sinotradecompliance.com |
| Portal | ✅ CI 通过 | https://trade-web-portal.pages.dev |
| Admin | ✅ CI 通过 | https://trade-web-admin.pages.dev |
| Blog | ✅ CI 通过 | https://trade-web-blog.pages.dev |

## 完整文档索引

| 文件 | 说明 |
|------|------|
| [GOAL.md](GOAL.md) | 项目目标、品牌 VI、核心规则、技术架构 |
| [TASK.md](TASK.md) | 任务清单与进展 |
| [NOTES.md](NOTES.md) | 翻译铁律、技术决策、踩坑记录 |
| [SOP.md](SOP.md) | 标准操作流程（开发/构建/部署/翻译）|
