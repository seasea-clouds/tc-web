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

## i18n Missing Key Detection (P3a)

`check-t-keys.mjs` (2026-07-03):
- Scans all `.ts`/`.tsx` for static `t("key")` calls
- Verifies each key exists in `en.json` (all namespaces flattened)
- Integrated into `ci-check.mjs` for portal builds
- Catches orphan keys before they reach production
- Excludes: dynamic keys `` t`prefix_${var}` ``, non-translation `t()` in API functions

## buildT en.json Fallback (P4)

`buildT(locale)` now falls back to en.json when locale key is missing:
- Caches English Check namespace on module load
- When `locale.Check.key` not found -> returns `en.Check.key`
- Last resort: returns raw key (should never happen with CI check-t-keys)
- Dev mode: `console.warn()` output for both fallback and fail cases

## ⚠️ 当前已知问题

### 静态资源代理
主站 Worker 将 HTML 中的 `/_next/static/*` 重写为 `/c/_next/static/*`，然后代理到 portal 独立域名取资源。

### Creem API Key 更新需重新部署
详见下方 CF Pages Secrets 更新策略。

## ✅ 已修复

### 硬编码英文（2026-06-28）
6 个 check-client.tsx 国际化已完成，每文件 ~60 个 t() 调用。
`check-i18n-keys.mjs` 报告：0 missing + 0 extra + 0 hardcoded。

### CI 流水线盲区（2026-06-28）
`check-hardcoded.mjs` 已扩展至 42KB，覆盖 .tsx 扫描 + placeholder/label/alt/title 属性。
`check-translations.mjs` 扫描 JSON，`check-hardcoded.mjs` 扫描 TSX，两脚本互补无空白。

### 表单提交不跳转（2026-06-28）
表单提交流程已验证：提交 -> 免费结果 -> 购买完整报告 全部正常。
核心 check 为纯客户端计算，不依赖 API；API 调用为 fire-and-forget。

### i18n 多语言覆盖（2026-06-28）
48 语言全覆盖，check-i18n-keys.mjs 报告 100%。
`check-translations.mjs` 仅剩 1 个豁免项（法语 nmpaRiskNote_tests 与英文相同）。

### 5. 静态资源代理
主站 Worker 将 HTML 中的 `/_next/static/*` 重写为 `/c/_next/static/*`，然后代理到 portal 独立域名取资源。

## ⚠️ CF Pages Secrets 更新策略

### 教训：secret put 不够，必须 delete + recreate

2026-07-02 更新 Creem API Key 时发现：
1. `wrangler pages secret put` 报 Success 但实际未更新值（旧 key 仍然有效）
2. 必须先 `wrangler pages secret delete` 再 `wrangler pages secret put`
3. 随后必须**触发新的 deployment** 让新 secret 生效（旧 deployment 绑定旧 secret）
4. GitHub auto-build 生成的新 deployment 才能读取到新 secret

### 故障诊断
- debug-creem 端点是验证 CF Pages 环境变量的最佳工具
- `apiKeyPrefix` 输出可快速确认当前生效的是哪个 key

## 进度记录

- **2026-05-23~25:** 项目迁入 monorepo，基础架构
- **2026-05-25:** 认证系统迁移至 httpOnly Cookie Session
- **2026-05-27:** Worker 代理从 compli-service 改为 c/
- **2026-06-04:** 修复硬编码英文 + 流水线 + 表单跳转 + 文档更新
- **2026-06-28:** i18n 全面完工：rules.ts 全模块国际化 + 48 语言翻译完成 + CI 全绿。更新 NOTES.md 清理已解决项。
- **2026-07-02:** Creem API key 更新为 `creem_test_4Xkla1XafsXmqUQ3x1fsrk`，debug-creem 端点验证通过（200 OK）。废弃 CF Pages 项目 `sinotradecompliance` + `compli-service` 已删除。
- **2026-07-03:** i18n 大修：341 缺失 key 补全 en.json，140 个 top-level key 复制到 Check namespace。新增 `check-t-keys.mjs` CI 脚本检测 `t("key")` 缺失引用。`buildT` 增加 en.json 降级（key 缺失时回退到英文）和 dev 环境 console.warn。
