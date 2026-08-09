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

翻译调用 `/root/projects/tool/translate/`，双渠道 Google Translate 免费无需 Key。

## Portal

### URL 架构

Portal 通过主站边缘 Worker 代理到 `/{locale}/c/*` 路径访问。
独立域名 `tc-web-portal.pages.dev` 用于直接部署测试。

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

### 静态资源代理架构（统一方案）

三站统一使用同一种代理策略：**CSS 改写专用路由 + JS catch-all 兜底**。

| 站 | CSS 路径 | JS 路径 | 原因 |
|---|---|---|---|
| **Portal** `/c/` | `<link href>` → 改写为 `/c/_next/static/*` → `proxySubSiteAsset` 直连 portal upstream | `<script src>` 保持 `/_next/static/chunks/*` → catch-all 先试 portal | Turbopack 运行时 `N()` 函数用硬编码基路径加载 JS chunk，改写会导致 hydration 失败 |
| **Blog** `/blog/` | 同上，前缀 `/blog/` → `proxySubSiteAsset` 直连 blog upstream | 同上，catch-all 先试 portal 后试 blog | 同上 |
| **Admin** `/admin/` | 原生 `basePath='/admin'`，HTML 路径天然带 `/admin/` 前缀 → `proxySubSiteAsset` 直连 | 同上，但不走 catch-all（basePath 天然隔离） | Admin 无需 locale 路由，basePath 是最干净的方案 |

**核心规则：**
- `<link href="/_next/static/...">` → 改写为 `/{prefix}/_next/static/...`（CSS、preload as=style 等非 script 资源）
- `<link rel="preload" as="script">` → **不改写**（预加载 URL 必须匹配实际 script 标签）
- `<script src="/_next/static/chunks/...">` → **不改写**（Turbopack N() 缓存键依赖原始路径）
- `/_next/static/chunks/*` → catch-all 自动路由到正确的 upstream（JS 资源必须经过此通道）

### 已知问题

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

### 站点图标统一方案（2026-08-02）

**单一真源**：`packages/brand/`（icon.png 512×512 透明 PNG + favicon.ico 多尺寸 16/32/48/64/128/256）

**同步脚本**：`packages/scripts/sync-icons.mjs` — 真源复制到各项目 `public/`，同时清理 `src/app/` 旧约定文件。改图标只改真源 + 跑脚本 + 提交。

**各项目处理**：
- site/portal/blog：`public/icon.png + favicon.ico`，Next.js 自动输出 3 条引用（favicon.ico sizes=any + icon.png PNG + apple-touch-icon）
- admin：**client 组件手写 `<head>`，Next.js 不会自动注入 icon** → layout.tsx 3 处 head 手动加 `<link>`（路径 `/admin/icon.png`），postbuild.sh 需把根目录 icon 文件移入 `out/admin/`

**踩坑**：
1. `src/app/` 约定文件会输出带 hash 的重复引用（如 `/icon.png?icon.xxx.png`），统一用 `public/` 即可避免
2. `.gitignore` 原用 `public/` 整目录忽略 → git 无法跟踪子文件（经典坑：父目录被忽略后 `!` 反规则不生效）→ 改为只忽略具体构建产物（sitemap/llms/search-index），图标可正常跟踪
3. JPEG 原图去白底要用 **flood fill 从边缘填充**（内部白色元素不连通边缘，安全），不能简单白色→透明（会破坏内部白色字母）
4. 图片处理：1310×1310 JPEG → flood fill 去白底 → 512×512 透明 PNG（LANCZOS 缩放）

**标准尺寸**：icon.png 512×512（PWA 标准，可降级）；favicon.ico 多尺寸 ICO。

### 客户故事文章翻译踩坑（2026-08-02，pet-food-brand-gacc-registration）

翻译工具输出到 MDX 重组后必须过 3 个 MDX 检查，常见问题：

1. **YAML 双引号嵌套**：翻译后标题可能含 `"`（如希伯来语 `ארה"ב`），破坏 frontmatter 解析 → 改用单引号包裹该字段。构建报错表现为 `/he/blog` 页面 Export error。
2. **E07 手动编号**：翻译引擎把 `### Step 1:` 译成 `### 1. lépés:`（数字开头）→ 与 CSS 自动编号冲突 → 改为 `### Lépés 1:`（词在前数字在后，不匹配 E07 正则 `/^###\s*(?:[1-9]|1[0-9]|20|30)[.、]/`）。
3. **R08 标题连字符**：全语言禁止标题含 `-`（如 az `ABŞ-ın`、de `US-amerikanische`）→ 改写标题措辞。
4. **R04 标题级别**：翻译引擎可能把 `##` 译成 `#`（be）→ 恢复为 `##`。
5. **ref 标准号未翻译**：`GB 10648 — Feed Label Standard` 含标准号，翻译引擎直接跳过（10 个语言保持英文）→ R20 报错 → 手动翻译各语言版本。
6. **CTA URL 本地化**：翻译引擎会：a) 把 `/en/packages/` 的 locale 前缀保留为 en；b) 把 URL 里的 packages 也翻译（cs/sk 变 `/en/balíčky/`）；c) 在 markdown 链接中插入空格 `] (/fr / packages/)`；d) 西里尔语言把 URL 译成西里尔字母（sr `/ен/пацкагес/`）→ 重组后必须统一替换 CTA URL 为 `/{locale}/packages/` 并修复破损链接。
7. **zh refs 双破折号**：`——` 被 check-md-format E02 禁止 → 改冒号 `：`（与现有 zh 文章 refs 风格一致）。
8. **CF Pages 部署状态误读**：`wrangler pages deployment list` 显示新部署 Status=Active 但部署专属 URL 404 → 实际是 build stage 仍在进行（构建 480 页面需数分钟），deploy stage 未开始。用 CF API 查 stages 确认：`GET /accounts/{account_id}/pages/projects/{project}/deployments`（account_id 可从 zone API 取）。生产域名在构建完成前仍指向旧部署，属正常。

翻译输入 JSON 必须用**扁平 dict**（`{"key": "text"}`），`{"items": [...]}` 结构会被 scanner 忽略（dict 分支只取字符串值）。

## Admin

### 技术决策

#### Proxy 架构
- Admin 通过主站 `_middleware.ts` 代理访问（`/admin/*` → `tc-web-admin.pages.dev`）
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
| tc-web-admin | ADMIN_JWT_SECRET, TURNSTILE_SECRET_KEY |
| tc-web-portal | CREEM_API_KEY, CREEM_PRODUCT_ID_SINGLE, CREEM_PRODUCT_ID_SUBSCRIBE, CREEM_WEBHOOK_SECRET, EMAIL_FROM, JWT_SECRET, RESEND_API_KEY, TURNSTILE_SECRET_KEY |
| tc-web-site | NODE_VERSION, UPSTREAM_BLOG, UPSTREAM_PORTAL, NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY |
| tc-web-blog | NODE_VERSION, NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY |

所有环境变量放在 `~/.openclaw/.env`。CF Dashboard 中各项目 Settings → Environment Variables 独立配置。

## tr 语言 GB 标准误译残留（2026-08-04，d1-tr 子代理发现）
tr.json 其他 namespace（非 D1 范围）存在 "Büyük Britanya"（英国标准误译，应为 GB 中国标准）：
- DefinitionSchema.gb7718Name: "Büyük Britanya 7718-2025"
- Faq.labelA4a、About.teamMember3Desc、BlogFaqChinaLabelCompliance.faqA4
→ 待后续 pass 统一修复（D4 FAQ 页差异化时顺带处理）

## D2 周期数值铁律（2026-08-04）
**官方周期/数值必须以 en 基线（apps/site/messages/en.json）为准，guide 仅提供 FAQ 主题参考。**
- 教训：D2 guide 初版写了 Dairy GACC 3-6 个月（en 实为 2-6）、Supplements 12-24（en 实为 12-24 正确，guide 错写 6-12），ja 子代理遵循 guide 写入错误值，主 agent 已修正 ja.json。
- 处理：任何 guide 数值与 en 冲突时，以 en 为准；子代理任务中已加"以 en 基线为周期权威"提醒。
- es 子代理自行核对 en 基线（2-6/12-24 正确），未犯此错。
