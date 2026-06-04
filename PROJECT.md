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
用户访问 → 主站 (trade-web-site.pages.dev)
              ├── /{locale}/...  → 主站自身 SSG 页面
              ├── /{locale}/c/...  → Worker 代理 → Portal (trade-web-portal.pages.dev)
              └── /{locale}/blog/... → Worker 代理 → Blog (trade-web-blog.pages.dev)
```

三站在 CF Pages 各自独立部署，通过主站的 `functions/_middleware.ts`（边缘 Worker）做代理转发。所有导航/页脚/语言切换由 `@trade/ui` 共享组件实现，用户感知上是一个完整的网站。

**当前阶段：** 开发模式。使用 CF 自带的 `.pages.dev` 域名访问，未切换到正式域名 `sinotradecompliance.com`。由 See 未来手动切换域名。

## 子项目

### 主站 — site
- **目录：** `apps/site/`
- **CF Pages 项目名：** `trade-web-site`
- **dev 域名：** `https://trade-web-site.pages.dev`
- **生产域名：** `sinotradecompliance.com`（未来切换）
- **用途：** 官网主站，品牌展示、服务介绍、行业页面
- **多语言：** `[locale]` 服务端路由，48 语言 SSG（静态导出）
- **SSG 输出目录：** `apps/site/out/`
- **代理功能：** `functions/_middleware.ts` 负责将 `/c/` → portal、`/blog/` → blog 的请求转发
- **入口：** [PROJECT.md](apps/site/PROJECT.md)

### 用户站 — portal
- **目录：** `apps/portal/`
- **CF Pages 项目名：** `trade-web-portal`
- **dev 域名：** `https://trade-web-portal.pages.dev`
- **主站代理路径：** `/{locale}/c/*`
- **旧名：** 曾用 "compli-service"，**已全面改为 "portal"**；URL 前缀从 `/compli-service/` 改为 `/c/`。
- **用途：** 合规工具箱 — 6 大合规自查工具（GACC/Label/CCC/NMPA/Cross-border/Trademark）
- **技术栈：** Next.js `output: 'export'`（SSG）+ next-intl + Pages Functions（API）
- **数据库：** Cloudflare D1（SQLite）
- **认证：** httpOnly Cookie Session
- **支付：** Creem
- **API 目录：** `apps/portal/functions/api/`
- **入口：** [PROJECT.md](apps/portal/PROJECT.md)

### 博客站 — blog
- **目录：** `apps/blog/`
- **CF Pages 项目名：** `trade-web-blog`
- **dev 域名：** `https://trade-web-blog.pages.dev`
- **主站代理路径：** `/{locale}/blog/*`
- **用途：** SinoTrade 合规博客
- **多语言：** `[locale]` 服务端路由，48 语言 SSG

### 管理后台 — admin
- **目录：** `apps/admin/`
- **部署：** CF Pages（未来）
- **用途：** 管理员面板（占位中）

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

**当前状态：** 使用 CF 自动分配的 `.pages.dev` 域名。
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

## 完整文档索引

| 文件 | 说明 |
|------|------|
| [GOAL.md](GOAL.md) | 项目目标、品牌 VI、核心规则、技术架构 |
| [TASK.md](TASK.md) | 任务清单与进展 |
| [NOTES.md](NOTES.md) | 翻译铁律、技术决策、踩坑记录 |
| [SOP.md](SOP.md) | 标准操作流程（开发/构建/部署/翻译）|
