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

#### PageSpeed 控制台错误：RSC 404 + auth 401（2026-08-11）

**症状：** PageSpeed 审计"控制台日志中已记录浏览器错误"报告两类错误：
1. `/api/auth/me` 返回 401（AuthProvider 每次页面加载都请求它检查登录态）
2. `/en/__next.*.txt?_rsc=...` 返回 404（Next.js 16 `output: export` 客户端导航/prefetch 请求 RSC flight payload，已被 clean-rsc.mjs 删除）

**修复：**
- `apps/portal/functions/api/auth/me.ts` + `apps/admin/functions/api/admin/auth/me.ts`：未登录从 401 改为 **200 + `{user:null}`/`{admin:null}`**（客户端 `data.user===null` 与 `setUser(null)` 等价，逻辑不变；浏览器不再记录 401 错误）
- `apps/site/functions/_middleware.ts`：RSC 204 短路从 `__next._tree.txt` 扩展为**所有 `/__next.*.txt`**（正则以 `$` 结尾防误伤），客户端拿到 204 后静默放弃 prefetch/导航请求

**验证：** curl 确认 auth/me 200、RSC 204；浏览器新标签页 console 无错误。
**注意：** 不要轻易恢复被 clean-rsc 删除的 .txt 文件——site 的 RSC payload 达 888MB/13261 个文件，会显著拖慢部署。

#### CF Pages _headers 多路径块不生效（2026-08-11）

**坑：** `_headers` 每个块只支持**一个** URL pattern。多个路径写在同一个块（如 `/icon.png\n/icon.webp\n/favicon.ico`）会导致**整块不生效**，回退到 CF 默认缓存（`max-age=28800`）。

**修复：** 每个路径单独成块，中间空行分隔。

**验证方法：** `curl -sI "https://sinotradecompliance.com/icon.webp?v=2" | grep cache-control`——immutable 生效应返回 `max-age=31536000, immutable`。带 `?v=` 参数可绕过边缘缓存。

**背景：** 之前 icon.png/favicon.ico 的 immutable 缓存实际从未生效（多路径块），2026-08-11 发现并修复。

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

## CF Pages/Worker 全量迁移踩坑记录（2026-08-09，trade- → tc-）

### 背景
GitHub 仓库从 `seasea-clouds/trade-web` 切换到 `seasea-clouds/tc-web`（空仓库）。Cloudflare 侧 4 个 Pages 项目 + 1 个 Worker 无法直接改 repo（见下），最终走「重建 + 迁移 + 清理」全量流程，全程 API 自动化，无需 Dashboard。

### 踩坑 1：Pages 项目无法 PATCH 修改 GitHub source
- `PATCH /accounts/{acct}/pages/projects/{name}` 传 `source` 对象：字符串 repo_id 被静默忽略（success:true 但 source 不变）；数字 repo_id 报 **8000006** "invalid JSON type or missing required keys"。
- API 文档 PATCH 示例只有 name/production_branch，没有 source 字段。
- **结论**：GitHub 连接绑定在账户级 OAuth/App 授权上，API Token 无法改。想换仓库只能删了重建。
- **但是**：`POST /accounts/{acct}/pages/projects` **create 时支持 `source` 字段**（type: "github", config: {owner, repo_name, production_branch}），全自动重建可行！这是本次迁移的关键突破口。

### 踩坑 2：删除 Pages 项目前必须先清空部署历史
- 直接 DELETE 项目报 **8000076**（too many deployments）。
- 必须先把所有 deployments 逐个 DELETE，清空后才能删项目。
- 本次清理量：site 837 + portal 849 + blog 808 + admin 430 ≈ 2924 个部署。

### 踩坑 3：deployments API 分页与限流
- `GET .../deployments` 的 `per_page` 最大 **25**（传 50 报 HTTP 400），分页用 `page` 参数，总数在 `result_info.total_count`。
- 批量 DELETE 部署易触发 **429 限流**：需低并发（2 线程）+ 指数退避重试（429 时 sleep 8s×(attempt+1)）。
- 个别部署 DELETE 报 400 是 **current/production 部署**，属正常，忽略即可。

### 踩坑 4：Worker script 无法通过 API Token 读取
- `GET /accounts/{acct}/workers/scripts/{name}` 返回 **405** "Method not allowed for this authentication scheme"。
- **结论**：Worker 源码必须保留在本地仓库（`apps/admin/workers/analytics-cron/src/index.ts`），重建时用本地源 `wrangler deploy`。
- secrets 通过 `npx wrangler secret put` 设置成功（直接 PUT API 会 405 method_not_allowed，code 1001）。

### 踩坑 5：webhook 触发部署可能卡队列
- 首次 git push 触发的部署全部卡在 queued（stages idle，status None，~10 分钟不动），webhook 和 GitHub App 覆盖其实正常（deployment_trigger 显示正确 commit）。
- **解法**：`POST /accounts/{acct}/pages/projects/{name}/deployments/{id}/retry` 手动重试，立即被构建队列接走。
- CF 构建队列是**串行**的（一次一个项目，每个约 2 分钟），4 个项目全量构建约 8-10 分钟。

### 踩坑 6：secret_text 环境变量值 API 不可读
- 生产/预览环境的 `secret_text` 变量值全部返回空，**无法通过 API 导出**。
- 重建时需手动重新输入（本地 `~/.openclaw/.env` 有 key 名但值已掩码，除 UPSTREAM_* 外）。plain_text 值可读。

### 踩坑 7：WSL 网络对 Cloudflare 边缘 TLS 不稳定
- 清理期间出现瞬时 `000` / exit 35（SSL handshake failure），api.cloudflare.com、pages.dev 全挂，但 github.com/baidu.com 正常；几秒后自动恢复。
- **结论**：本地（WSL）到 CF 边缘的网络/TLS 路径间歇抖动，不是 CF 侧问题。遇到先重试、不要误判。

### 踩坑 8：Pages cron（_scheduled.ts）必须走 git push 部署
- `apps/admin/functions/_scheduled.ts` 定义每小时回填 cron（`0 * * * *` UTC），**必须通过 git push 触发 CF Pages 构建**才能注册调度；直接 `wrangler pages deploy` 会绕过构建管线，cron 不生效。
- 独立 Worker 的 cron（analytics-cron）则在 wrangler.toml `[triggers] crons` 定义，`wrangler deploy` 直接生效。

### 踩坑 9：域名迁移顺序
1. 先给新项目（tc-web-site）添加自定义域名 → 等 SSL 签发（Google CA，<1 分钟）→ 验证完整链路
2. 再 PATCH DNS CNAME 指向新 pages.dev 主机
3. 最后删旧项目（此时旧项目上的自定义域名已被回收）
- 顺序反了会有一段域名解析到已删除项目。apex CNAME（sinotradecompliance.com → tc-web-site.pages.dev）是唯一需要改的 DNS 记录（www/m 指向 apex 不用动）。

### 踩坑 10：子页面 canonical fallback 到父级 → GSC 备用网页（2026-08-11）
- **现象**：GSC 71 条 `备用网页（有适当的规范标记）`（/c/pricing/、/quote/?package=*、blog 无斜杠等）。
- **根因**：`apps/portal/src/app/[locale]/c/pricing/page.tsx` 是纯 `'use client'` 组件、无自己的 `generateMetadata`，fallback 到 `[locale]/c/layout.tsx` 硬编码的 `/c/` canonical → 每语言 pricing 都 canonical 到对应语言首页，Google 视为重复页丢弃。login/register 同理（未在 GSC 列表内，后续可同法修）。
- **修复**：① pricing 拆 server wrapper（`page.tsx` 持 `generateMetadata`，canonical 指向自身）+ `pricing-client.tsx`；② `_middleware.ts` blog 分支补尾斜杠 308（`/ko/blog` → `/ko/blog/`）。
- **CI 联动**：`check-seo-patterns.mjs` 会把 page 路径下任意 .tsx 当页面检查 —— 拆出的 `pricing-client.tsx` 需加入 `CLIENT_COMPONENT_EXEMPT`，同时把 `/c/pricing/` 从 `PORTAL_LAYOUT_INHERIT` 移除（已有独立 metadata 后必须真检查）。
- **验证**：部署专属 URL 404 属正常（NOTES 踩坑 8），等 stages `deploy=success` 后生产域名验证；CF 边缘节点收敛有延迟，同一 URL 前几次可能旧版 200/新版 308 混出，多请求复验（3×8 语言全 308、10 语言 pricing canonical 全自指）确认生效。

### 遗留事项
- D1 数据库 `trade-web-portal-db`（uuid e84f0762-...）**刻意保留原名**，所有项目/Wranger 配置的 `database_name` 也是这个名字，未重建（数据零丢失）。
- `.env.example` 和 `wrangler.toml.example` 已同步更新为 tc- 前缀。
- PROJECT.md 中保留迁移历史说明（唯一合法的 trade-web 引用）。

### 踩坑 11：portal auth 子页面 canonical fallback 全面修复（2026-08-11 续）
- **背景**：踩坑 10 修复后，login/register/me/report 8 个页面仍 fallback 到 `/c/` canonical（与 pricing 同 bug 模式，未在 GSC 71 列表内）。
- **修复**：
  - login/register/me/*（4）/report/*（2）共 8 个页面全部拆 server wrapper + `xxx-client.tsx`，`generateMetadata` canonical 指向自身，不再 fallback 到 `/c/`。
  - login/register 保持 noindex（`c/login/layout.tsx`、`c/register/layout.tsx` 静态 `robots: { index: false }`，项目既有决策 GSC issue 4c，勿删）；me/report 页面 wrapper 内加 `robots: { index: false, follow: false }`（登录后隐私页）。
  - **title 修复**：next-intl `onError` 静默时 `t('metaTitle')` 返回 truthy 的 `Auth.metaTitle` 字面量导致 `||` fallback 失效 —— wrapper 改用已有 key：Auth 用 `signInTitle/signInDesc/registerTitle/registerDesc`，Pricing 用 `title/subtitle`（48 语言已有翻译）。
- **布局链接补斜杠**：site/portal/blog 三个 `layout.tsx` 的 `loginHref`/`logoutRedirect` 从 `/${locale}/c/login` → `/${locale}/c/login/`；login/register 页面内 `/${locale}/c/me`、`/${locale}/privacy`、`/${locale}/terms`、`/${locale}/c/register`、`/${locale}/c/login` 全部补 `/`。
- **blog layout fallback**：`buildAlternates(validLocale, [...locales], '')` → `'/blog/'`（消除无斜杠 canonical fallback）；blog 首页 `[locale]/page.tsx`（client redirect）拆 server wrapper，canonical 指向 `/{locale}/` + noindex（redirect 页），`root-redirect-client.tsx` 加入 `CLIENT_COMPONENT_EXEMPT`。
- **CI 联动**：`check-seo-patterns.mjs` —— 8 个新 client 文件 + `root-redirect-client.tsx` 加入 `CLIENT_COMPONENT_EXEMPT`；删除 `PORTAL_AUTH_ROUTES` 豁免（8 页面已有独立 metadata，必须真检查）；blog 分支移除 `page.tsx` 豁免；`check-console.mjs` 的 `ALLOWED_FILES` 中 `report/page.tsx` → `report-client.tsx`。
- **check-hardcoded 陷阱**：metadata description 含逗号会被 `ENGLISH_PROSE_RE` 当 JSX prose 报错（正则以 `,`/`<` 结尾匹配）—— description 文案避免逗号。
- **验证**：三项目构建全绿（portal 240 页、blog 全绿、site 全绿）；产物 canonical 全部自指（login/register/me/report 8 页面 + pricing + blog 首页/列表/文章），noindex 正确，hreflang 49 条目完整。

### 踩坑 12：compli-service 旧路径彻底移除（2026-08-12）
- **背景**：GSC 报"重复网页，用户未选定规范网页"3 个 URL（`/nl/compli-service/check/trademark`、`/nl/compli-service/check/label`、`/fa/compli-service/`），6 月初抓取的旧状态。此前 8/3 fix 3b/4b（commit a5b428bb）已在 `apps/site/public/_redirects` 加 48 语言 `compli-service → /c/` 301。
- **用户决策**：`/compli-service` 是旧网站路径，新网站已无此路径，**不需要 301 跳转、不需要 Google 收录** → 直接删规则让旧路径 404，Google 抓取 404 后自动从索引移除。
- **操作**：`apps/site/public/_redirects` 删除全部 98 行 compli-service 规则（48 带斜杠通配 + 48 无斜杠精确 + 2 注释），只保留 `/ → /en/ 302`（commit 1543d2bf）。
- **顺手修复（上一条 abb745c1）**：发现 `/{locale}/compli-service` 无斜杠版本 404（通配规则匹配不到），补过 48 条精确规则——随后被本条整体移除替代，无需保留。
- **验证**：8 个 compli-service URL 全部 404（fa/nl/en/zh/ar × 带/不带斜杠/子路径），新路径 `/c/` 全部 200，首页 302 正常。
- **注意**：`packages/ui/src/LanguageSwitcher.tsx:77` 的 localStorage key `compli-service-locale` 保留未改（纯本地存储键名，与 URL 无关，改需全站重建不值当）。
- **延续清理（2026-08-12 09:56）**：用户要求 compli-service 彻底去掉 → 清理 localStorage key：
  - `compli-service-locale`（`packages/ui/src/LanguageSwitcher.tsx`，语言偏好，仅写无读）→ `stc-locale`
  - `compli-report-input`（6 个 check-client 写 + report-client 读，报告草稿）→ `stc-report-input`
  - 共 8 文件 14 处替换，portal 构建全绿（240 页），线上 JS bundle 无残留；注意：改 key 后老用户本地旧 key 数据不再读取（语言偏好/未提交草稿会丢一次，无害）
