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

## ⚠️ 当前已知问题

### 静态资源代理
主站 Worker 将 HTML 中的 `/_next/static/*` 重写为 `/c/_next/static/*`，然后代理到 portal 独立域名取资源。

## ✅ 已修复

### 硬编码英文（2026-06-28）
6 个 check-client.tsx 国际化已完成，每文件 ~60 个 t() 调用。
`check-i18n-keys.mjs` 报告：0 missing + 0 extra + 0 hardcoded。

### CI 流水线盲区（2026-06-28）
`check-hardcoded.mjs` 已扩展至 42KB，覆盖 .tsx 扫描 + placeholder/label/alt/title 属性。
`check-translations.mjs` 扫描 JSON，`check-hardcoded.mjs` 扫描 TSX，两脚本互补无空白。

### 表单提交不跳转（2026-06-28）
表单提交流程已验证：提交 → 免费结果 → 购买完整报告 全部正常。
核心 check 为纯客户端计算，不依赖 API；API 调用为 fire-and-forget。

### i18n 多语言覆盖（2026-06-28）
48 语言全覆盖，check-i18n-keys.mjs 报告 100%。
`check-translations.mjs` 仅剩 1 个豁免项（法语 nmpaRiskNote_tests 与英文相同）。

### 5. 静态资源代理
主站 Worker 将 HTML 中的 `/_next/static/*` 重写为 `/c/_next/static/*`，然后代理到 portal 独立域名取资源。

## 进度记录

- **2026-05-23~25:** 项目迁入 monorepo，基础架构
- **2026-05-25:** 认证系统迁移至 httpOnly Cookie Session
- **2026-05-27:** Worker 代理从 compli-service 改为 c/
- **2026-06-04:** 修复硬编码英文 + 流水线 + 表单跳转 + 文档更新
- **2026-06-28:** i18n 全面完工：rules.ts 全模块国际化 + 48 语言翻译完成 + CI 全绿。更新 NOTES.md 清理已解决项。
