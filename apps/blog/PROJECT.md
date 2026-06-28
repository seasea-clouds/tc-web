# Blog — SinoTrade 合规博客

## 项目定位

SinoTrade Compliance 品牌的多语言合规博客，通过高质量教育内容获客。

- **目录：** `apps/blog/`
- **CF Pages 项目名：** `trade-web-blog`
- **dev 域名：** `https://trade-web-blog.pages.dev`
- **主站代理路径：** `sinotradecompliance.com/{locale}/blog/`

## 技术栈

- Next.js（SSG 静态导出）+ next-intl + TypeScript + Tailwind CSS
- 内容：Markdown + gray-matter 前置元数据
- 共享 UI：`@trade/ui`（Navbar/Footer/LanguageSwitcher）
- 共享脚本：`packages/scripts/`（CI 检查、搜索索引）

## 多语言

- 48 语言，内容存放在 `content/{locale}/` 目录
- 每篇文章有对应语言的 Markdown 文件
- 通过 `[locale]/blog/[slug]` 路由服务端渲染

## 部署

- push `main` → 自动触发 CF Pages 构建
- 改 `apps/blog/**` → 触发博客
- 改 `packages/ui/**` 或 `packages/scripts/**` → 触发所有站
- 主站 `_middleware.ts` 代理 `/{locale}/blog/` → blog 站
