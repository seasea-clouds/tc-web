# NOTES.md — 各站参考资料与注意事项

## 官网（site）

### 🌐 翻译铁律

- **翻译不怕慢，就怕不准** — 质量永远优先于速度
- 48 种语言的每一个页面，标题和内容必须翻译完全准确，绝不允许使用英文做后备
- **🔴 禁止英文 fallback** — 任何字段、任何语言都不允许用英文填充，品牌名除外
- 品牌名 "SinoTrade Compliance" 所有语言保持英文，不翻译
- 联系方式所有语言保持一致（邮箱 / WhatsApp / 地址不翻译）

### 禁止翻译词表（NO_TRANSLATE）

| 类别 | 示例 |
|------|------|
| **品牌名** | SinoTrade Compliance, WhatsApp, WeChat, Tmall, LinkedIn, Facebook, Twitter, YouTube |
| **人名** | David Zhang, Sarah Chen, Mike Wang, Leo Liu, John Smith |
| **机构缩写** | GACC, NMPA, CCC, CBEC, CIFER, MOA, CNCA, MEE |
| **标准编号** | GB 7718-2025 |
| **邮箱占位符** | you@company.com |
| **其他** | FAQ, min |

### Google Translate 短词修正

| 英文 | zh | ja | ko | ar | fr | de | es | ru |
|------|----|----|----|----|----|----|----|----|
| Home（导航） | 首页 | ホーム | 홈 | الرئيسية | Accueil | Startseite | Inicio | Главная |
| Contact（导航） | 联系我们 | お問い合わせ | 문의하기 | اتصل بنا | Contactez-nous | Kontakt | Contacto | Контакты |
| Services（导航） | 服务 | サービス | 서비스 | الخدمات | Services | Dienstleistungen | Servicios | Услуги |
| WhatsApp（品牌） | WhatsApp | WhatsApp | WhatsApp | WhatsApp | WhatsApp | WhatsApp | WhatsApp | WhatsApp |

### 翻译引擎

翻译调用 `/root/projects/translate-tool/`，双渠道 Google Translate 免费无需 Key。

### 部署验证

构建时自动注入时间戳到页面 HTML：
```html
<meta name="build-commit" content="{commit_sha}" />
<meta name="build-time" content="{ISO_timestamp}" />
```

验证方法：
```bash
curl -s https://sinotradecompliance.com/en/industries/ | grep -oP 'build-commit" content="[^"]*"'
git log --oneline -1
```

## Portal

### URL 架构

Portal 通过主站边缘 Worker 代理到 `/{locale}/c/*` 路径访问。
独立域名 `trade-web-portal.pages.dev` 用于直接部署测试。

- Portal 内部链接用 `useSubsiteHref()` hook 生成
- API 调用用 `API_BASE` 常量
- 指向主站的链接用 `/{locale}/...`（导航/页脚）

### 架构决策

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

### Portal 环境变量

`~/.openclaw/.env` 管理。CF Pages 已配置：
- CREEM_API_KEY / CREEM_WEBHOOK_SECRET
- CREEM_PRODUCT_ID_SINGLE / CREEM_PRODUCT_ID_SUBSCRIBE
- RESEND_API_KEY / EMAIL_FROM / JWT_SECRET / NODE_VERSION=22

### ⚠️ 当前已知问题

#### 静态资源代理
主站 Worker 将 HTML 中的 `/_next/static/*` 重写为 `/c/_next/static/*`，然后代理到 portal 独立域名取资源。

#### Creem API Key 更新需重新部署
CF Pages secret 必须先 delete 再 put 才能生效，之后需要触发新 deployment。

## Blog

### CI 差异
博客的 CI 检查跳过 industry-meta 和 portal 模块（blog 仅有 Blog+Cookie 命名空间）。

### 搜索索引
博客内容纳入主站统一搜索索引，通过 `packages/scripts/build-search-index.mjs` 生成。

### 构建命令
```bash
cd apps/blog
node ../../packages/scripts/build-search-index.mjs \
  && rm -rf .next/cache \
  && next build \
  && node ../../packages/scripts/ci-check.mjs --out-dir=out --ci
```

## Admin

### 技术决策

#### Proxy 架构
- Admin 通过主站 `_middleware.ts` 代理访问（`/admin/*` → `trade-web-admin.pages.dev`）
- API 路径 `/api/admin/*` 通过 `proxyFetch()` 代理

#### D1 数据库
- 共享 Portal 项目的 D1 数据库（binding name: `DB`）
- Admin 使用独立的 D1 表（`admin_users`, `admin_logs` 等）

#### Turnstile 人机验证
- Admin 使用独立 Turnstile widget，site key: `0x4AAAAAADqoEtL5oqrpaf3R`
- 与 Portal 的 Turnstile 不同

#### 静态导出
- `output: 'export'` + `basePath: '/admin'`，产出到 `out/admin/` 目录
- CF Pages Functions 负责 API 路由

#### 数据分析 — CF Analytics GraphQL + D1 缓存
- 库文件：`functions/lib/cf-analytics.ts` + `functions/lib/d1-cache.ts`
- `fetchDailyStats()` — httpRequests1dGroups：PV/UV/国家/浏览器/状态码
- `fetchHourlyStats()` — httpRequests1hGroups：每小时 PV/UV
- `fetchAggregateStatsRange()` — httpRequestsAdaptiveGroups：路径/OS/设备/项目分布
- **缓存策略**：每日数据不可变，从 CF 取一次后永久缓存；每小时数据（今日）逐步缓存
- API 端点：`GET /api/admin/analytics?range=today|7d|30d`
- **定时回填**：独立 Worker `workers/analytics-cron/`（cron: `0 * * * *` UTC），`wrangler deploy`

### 环境变量管理

| 项目 | 必要变量 |
|------|---------|
| trade-web-admin | ADMIN_JWT_SECRET, TURNSTILE_SECRET_KEY |
| trade-web-portal | CREEM_API_KEY, CREEM_PRODUCT_ID_SINGLE, CREEM_PRODUCT_ID_SUBSCRIBE, CREEM_WEBHOOK_SECRET, EMAIL_FROM, JWT_SECRET, RESEND_API_KEY, TURNSTILE_SECRET_KEY |
| trade-web-site | NODE_VERSION, UPSTREAM_BLOG, UPSTREAM_PORTAL, NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY |
| trade-web-blog | NODE_VERSION, NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY |

所有环境变量放在 `~/.openclaw/.env`。CF Dashboard 中各项目 Settings → Environment Variables 独立配置。
