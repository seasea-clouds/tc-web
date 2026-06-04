# Portal — 技术决策与踩坑记录

## URL 架构

Portal 通过主站边缘 Worker 代理到 `/{locale}/c/*` 路径访问。
独立域名 `trade-web-portal.pages.dev` 用于直接部署测试。

- Portal 内部链接用 `useSubsiteHref()` hook 生成
- API 调用用 `API_BASE` 常量
- 指向主站的链接用 `/{locale}/...`（导航/页脚）

## 架构决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 路径 | `/c/` 子路径，主站 Worker 代理 | SEO 最优，继承主域权重 |
| 支付 | Creem（PaymentProvider 抽象） | Merchant of Record，松耦合可换 |
| 邮件 | Resend（EmailProvider 抽象） | 已测通，松耦合可换 |
| PDF | @react-pdf/renderer v4.5.1 | React 组件生成 PDF，风格一致 |
| 人机验证 | CF Turnstile | 免费、无感、CF 原生 |
| 认证 | httpOnly Cookie Session | 安全，兼容 Pages Functions |
| 部署 | CF Pages + Worker 路由 | 独立 CI/CD，互不影响 |
| 多语言 | next-intl + 同主站 locale 列表 | 48 语言特色 |

## Portal 环境变量

`~/.openclaw/.env` 管理。CF Pages 已配置：
- CREEM_API_KEY / CREEM_WEBHOOK_SECRET
- CREEM_PRODUCT_ID_SINGLE / CREEM_PRODUCT_ID_SUBSCRIBE
- RESEND_API_KEY / EMAIL_FROM / JWT_SECRET / NODE_VERSION=22

## 已知问题

### 1. 硬编码英文
6 个 check-client.tsx 有大量标题/label/placeholder/描述未用 `t()`。
修复中（见 TASK.md T3）。

### 2. 流水线盲区
- `check-hardcoded.mjs` 正则覆盖率不足，缺失 placeholder 属性扫描
- `check-translations.mjs` 不扫 .tsx，两个脚本间存在空白地带
修复中（见 TASK.md T2）。

### 3. 提交表单不跳转
API 调用链在 SSG 环境下可能断裂，依赖 catch 静默吞异常。
修复中（见 TASK.md T4）。

### 4. i18n 多语言
- 48 语言框架已就绪，但大量文案仍是英文占位
- Portal 用 next-intl，与主站共享 routing.ts 和 messages.ts
- LanguageSwitcher 用 localStorage 同步跨站语言

### 5. 静态资源代理
主站 Worker 将 HTML 中的 `/_next/static/*` 重写为 `/c/_next/static/*`，然后代理到 portal 独立域名取资源。

## 进度记录

- **2026-05-23~25:** 项目迁入 monorepo，基础架构
- **2026-05-25:** 认证系统迁移至 httpOnly Cookie Session
- **2026-05-27:** Worker 代理从 compli-service 改为 c/
- **2026-06-04:** 修复硬编码英文 + 流水线 + 表单跳转 + 文档更新
