# trade-web — SinoTrade 网站 Monorepo

> **新会话指引：** 读此文件了解网站项目全貌，然后按需读取子项目的 4 文件。
>
> **目录：** `/root/projects/trade/web/`
> **GitHub：** `seasea-clouds/trade-web`

## 项目定位

SinoTrade 品牌的所有网站代码统一放在此 monorepo 中。四个独立部署的 CF Pages 应用共享同一套 UI 组件包，视觉完全一致，用户感觉不到跨站。

**非独立产品** — 是官网的获客-教育-转化漏斗的线上展示层。

## 子项目

### 主站 — site
- **目录：** `apps/site/`
- **部署：** CF Pages → `sinotradecompliance.com`
- **用途：** 官网主站，品牌展示、服务介绍、行业页面
- **多语言：** `[locale]` 服务端路由，48 语言 SSG
- **入口：** [PROJECT.md](apps/site/PROJECT.md)

### 博客 — blog
- **目录：** `apps/blog/`
- **部署：** CF Pages → `trade-web-blog.pages.dev`（主站 Worker 代理到 `/blog/`）
- **用途：** SinoTrade 合规博客
- **多语言：** `[locale]` 服务端路由，48 语言 SSG

### 用户站 — portal
- **目录：** `apps/portal/`
- **部署：** CF Pages → `compli-service.pages.dev`（主站 Worker 代理到 `/c/`）
- **用途：** 合规工具箱 — 自查工具、计算器、文档生成
- **API：** Pages Functions（D1 + httpOnly Cookie Session）
- **入口：** [PROJECT.md](apps/portal/PROJECT.md)

### 管理后台 — admin
- **目录：** `apps/admin/`
- **部署：** CF Pages（未来）
- **用途：** 管理员面板（占位中）

### 共享组件 — ui
- **目录：** `packages/ui/`
- **用途：** 四站共享 UI（Navbar/Footer/LanguageSwitcher/CookieConsent/Theme tokens）
- **Key files:** `Navbar.tsx`, `Footer.tsx`, `LanguageSwitcher.tsx`, `CookieConsent.tsx`, `constants.ts`, `theme.css`

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
