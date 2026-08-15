# tc-web 标准操作流程

## 本地开发

```bash
# 安装依赖
cd /root/projects/tradecompliance/web
npm install

# 同时启动所有站
npm run dev

# 或单独启动
cd apps/site && npx next dev     # 主站 → localhost:3002
cd apps/portal && npx next dev   # Portal → localhost:3003（用 /en/c/ 访问）
cd apps/blog && npx next dev     # 博客 → localhost:3004
```

## 构建验证

```bash
# 所有站单独构建
cd apps/site   && npx next build   # 主站（含统一索引生成）
cd apps/portal && npx next build   # 用户站
cd apps/blog   && npx next build   # 博客站
```

## 部署

### 三个独立 CF Pages 项目

| 项目 | 项目名 | Root dir | 生产域名（未来）| dev 域名 |
|------|--------|----------|----------------|----------|
| 主站 | `tc-web-site` | `apps/site` | sinotradecompliance.com | tc-web-site.pages.dev |
| Portal | `tc-web-portal` | `apps/portal` | — | tc-web-portal.pages.dev |
| Blog | `tc-web-blog` | `apps/blog` | — | tc-web-blog.pages.dev |

**当前阶段：** 已切换至正式域名 `sinotradecompliance.com`（2026-06-09）。生产部署由 GitHub push → CF Pages 自动构建部署。

### CF Pages 构建设置

| 设置 | 值 |
|------|-----|
| 生产分支 | `main` |
| Build command | `npx next build` |
| Build output | `out` |
| Root directory | `apps/{site|portal|blog}` |

### 自动触发
- 推送到 `main` 分支 → 所有项目自动触发构建
- 改 `apps/site/**` → 触发主站
- 改 `apps/portal/**` → 触发 Portal
- 改 `apps/blog/**` → 触发博客
- 改 `packages/ui/**` → 触发所有站
- 改 `packages/scripts/**` → 触发所有站

### ⚠️ Portal Worker 大小限制（Free Plan）

**问题：** Portal 的 Cloudflare Functions（23 个 API 端点，位于 `apps/portal/functions/`）打包后超过 Free Plan 的 **3 MiB 限制**，wrangler CLI 部署失败（`Your Worker exceeded the size limit of 3 MiB`）。

**影响：**
- Portal 的 API 端点（`/api/auth/*`、`/api/report/*`、`/api/payment/*`、`/api/subscription/*` 等）不可用
- 用户无法登录、保存报告、处理支付

**部署方法（已有）**
1. **✅ GitHub auto-build（推荐）：** 推送到 `main` 分支 → CF Pages 自动从 GitHub 构建+部署。CF 环境的构建管线能通过 Worker 大小限制。
2. **❌ wrangler CLI 直接部署：** 使用 `npx wrangler pages deploy ./out --project-name=tc-web-portal` 会因 Worker 超限失败。

**紧急回滚（如用无 Functions 的部署覆盖了生产环境）：**
```bash
# 1. 找到最近的 GitHub auto-build deployment ID
npx wrangler pages deployment list --project-name=tc-web-portal | grep -v "Failure"

# 2. 通过 CF API 回滚到该 deployment
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/tc-web-portal/deployments/${DEPLOYMENT_ID}/rollback" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

**解决方法（规划中）：** 升级到 CF Pro Plan（$5/月）可支持 10 MiB Workers。

### 主站代理转发

主站 `functions/_middleware.ts`（CF Pages 边缘 Worker）处理子站代理。**统一策略：CSS 改写专用路由 + JS catch-all 兜底。**

| 模式 | 操作 | 说明 |
|------|------|------|
| `/{locale}/c/*` | 转发到 portal | HTML 中 CSS 路径改写为 `/c/_next/static/*` + 注入 search widget + ensureNextF |
| `/{locale}/blog/*` | 转发到 blog | CSS 路径改写为 `/blog/_next/static/*` + 注入 + ensureNextF |
| `/admin/*` | 转发到 admin | basePath 原生隔离，CSS/JS 路径天然带 `/admin/` 前缀 |
| `/api/admin/*` | 转发到 admin API | |
| `/api/*` | 转发到 portal Pages Functions | |
| `/c/_next/static/*` | `proxySubSiteAsset` 直连 portal | CSS 等非 script 资源 |
| `/blog/_next/static/*` | `proxySubSiteAsset` 直连 blog | |
| `/admin/_next/static/*` | `proxySubSiteAsset` 直连 admin | basePath 已内置 |
| `/_next/static/chunks/*` | catch-all 试 portal → blog | JS chunk（script 路径不改写，因为 Turbopack N() 硬编码） |
| `__next._tree.txt` | 返回 204 | SSG 无 RSC 服务器，避免 Worker 反复 404 |
| `/c/`（裸路径） | 302 → `/{locale}/c/` | 浏览器语言检测 |
| `/blog/`（裸路径） | 302 → `/{locale}/blog/` | |
| `/`（根路径） | 302 → `/{locale}/` | |
| www / .pages.dev | 301 → `sinotradecompliance.com` | 规范主机名 |

### Portal D1 配置
1. CF Dashboard → Workers & Pages → tc-web-portal → Settings → Functions
2. D1 database bindings → 添加绑定
   - Variable name: `DB`
   - Database: 选择或创建 D1 数据库
3. Environments variables → 添加需要的变量

### Portal 环境变量
| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥 |
| `CREEM_API_KEY` | Creem 支付密钥 |
| `CREEM_PRODUCT_ID_SINGLE` | 单次报告产品 ID |
| `CREEM_PRODUCT_ID_SUBSCRIBE` | 订阅产品 ID |
| `RESEND_API_KEY` | 邮件服务密钥 |
| `EMAIL_FROM` | 发件人地址 |

## CI Pipeline

### 设计原则
1. **所有检测脚本统一在 `packages/scripts/`**，不得各自维护。
2. **每个项目调用同一套 `ci-check.mjs --out-dir=out --ci`**，自动从 cwd 识别项目，差异在脚本内精确处理。
3. **不得降低检测强度或缩小范围**。遇到不适合检测的场景，在共享脚本中添加精确特殊处理（如 `--skip-pattern`），而非移除检查或缩小 scope。
4. **检测出的问题必须修复**，而非掩盖或绕过。

### 统一检查入口：`ci-check.mjs`

| 项目 | 调用方式 | 说明 |
|------|----------|------|
| site | `ci-check.mjs --out-dir=out --ci` | SSG 全量输出（自动识别为 site）|
| portal | `ci-check.mjs --out-dir=out --ci` | SSG 输出（自动识别为 portal）|
| blog | `ci-check.mjs --out-dir=out --ci` | SSG 输出（自动识别为 blog）|

`ci-check.mjs` 运行以下全部检查（按顺序）：
| # | 检查脚本 | 适用项目 | 说明 |
|---|---------|----------|------|
| 1 | `check-seo-patterns.mjs` | 所有 | page.tsx 导出 generateMetadata、alternates 完整性 |
| 2 | `check-hardcoded-domain.mjs` | 所有 | 禁止 dev pages.dev 域名硬编码 |
| 3 | `check-hardcoded.mjs` | 所有 | 全量扫描硬编码英文字符串 |
| 4 | `check-console.mjs` | 所有 | 禁止 console.log 残留 |
| 5 | `check-rtl.mjs` | 所有 | RTL 语言排版检查 |
| 6 | `check-map-key.mjs` | 所有 | JSX .map() 缺少 key 属性检查 |
| 7 | `check-jsonld.mjs` | 所有 | JSON-LD 结构化数据完整性 |
| 8 | `check-hreflang.mjs` | 所有 | hreflang 标签完整性 |
| 9 | `check-llms.mjs` | 有 llms.txt 的 | llms.txt 质量检查 |
| 10 | `check-seo-output.mjs` | 所有 | 构建后标题/描述/canonical 检查 |
| 11 | `check-translations.mjs` | 所有 | 48 语言翻译质量检查 |
| 12 | `check-t-keys.mjs` | portal | 扫描 t("key") 调用，验证 en.json 存在 |
| 13 | `clean-rsc.js` | 有 out/ 的 | 清理 RSC payload .txt 文件 |

### 项目间差异处理

| 差异点 | 处理方式 |
|--------|----------|
| Site hreflang | `--skip-pattern=/blog/,404,_not-found`（跳旧 blog 页面+错误页）|
| Portal hreflang | `--skip-pattern=404,_not-found`（跳非内容页）|
| Blog hreflang | `--skip-pattern=404,_not-found`（跳非内容页）|
| Portal translations | `--skip-locale-check` 跳过 locale consistency（portal messages 独立）|
| Blog translations | `--skip-industry-meta --skip-portal-check`（blog 仅有 Blog+Cookie 命名空间）|
| Site translations | 全量检查（所有模块都运行）|
| llms.txt | auto-detect（存在则检查，不存在则跳过）|

### 各项目构建管线

```
# Site (apps/site)
  convert-webp → build-search-index → build-search-translations → next build → build-all
  → ci-check.mjs --project=site --out-dir=out --ci

# Portal (apps/portal)
  build-search-index → next build → ci-check.mjs --project=portal --out-dir=out --ci
  （hreflang 由 buildAlternates SSG 生成，构建时 check-hreflang.mjs --dir=out 检查，无需部署后验证）

# Blog (apps/blog)
  lint → build-search-index → next build → ci-check.mjs --project=blog --out-dir=out --ci
```

### 维护规范
1. 所有检查脚本在 `packages/scripts/`。
2. 新增检查必须在 `ci-check.mjs` 中注册。
3. 所有检查脚本必须支持 `--ci` 模式（失败时 exit 1，clean-rsc 除外）。
4. 项目差异通过 `--project` 参数 + 脚本内部特殊处理实现，不创建脚本副本。

## 共享 UI 组件

所有子站复用主站的页头页脚，从 `@trade/ui` 包导入：

```typescript
import Navbar from '@trade/ui/Navbar';
import Footer from '@trade/ui/Footer';
import { SearchProvider } from '@trade/ui';
```

组件位于 `packages/ui/src/`，所有 app 在 `tsconfig.json` 中配置路径映射：
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@trade/ui": ["../../packages/ui/src"]
    }
  }
}
```

## 共享编译脚本

所有编译脚本位于 `packages/scripts/`：

| 脚本 | 功能 |
|------|------|
| `discover-routes.mjs` | 自动扫描 page.tsx 发现路由 |
| `build-sitemap.mjs` | 生成多语言 sitemap |
| `build-llms.mjs` | 生成 LLM 发现文件 |
| `build-search-index.mjs` | 生成统一搜索索引 |
| `build-robots.mjs` | 生成 robots.txt |
| `build-all.mjs` | 总入口：运行以上所有脚本 |
| `check-translations.mjs` | 翻译质量检查（全量核验）|
| `check-hardcoded.mjs` | 检查 JSX 中硬编码英文 |
| `check-t-keys.mjs` | 扫描 t("key") 调用，验证 en.json 存在 |
| `convert-webp.mjs` | 图片格式转换 |
| `clean-rsc.js` | 清理构建产物 |

各站 build 命令：

**主站（生成全部索引）：**
```bash
node ../../packages/scripts/images/convert-webp.mjs \
  && next build \
  && node ../../packages/scripts/build-all.mjs --base-url=https://sinotradecompliance.com --out-dir=out \
  ; node ../../packages/scripts/clean-rsc.js \
  && node ../../packages/scripts/check-translations.mjs --short
```

**用户站/博客站：**
```bash
next build \
  && node ../../packages/scripts/check-hardcoded.mjs --ci \
  && node ../../packages/scripts/check-translations.mjs --short \
  ; node ../../packages/scripts/clean-rsc.js
```

## 统一索引文件

主站构建时自动生成以下索引文件（写入 `apps/site/out/`）：

| 文件 | 数量 | 说明 |
|------|:----:|------|
| `sitemap.xml` | 1 | 总索引 → 各语言 sitemap |
| `sitemap-{locale}.xml` | 51 | 分语言站地图（含所有子站路由）|
| `sitemap-images.xml` | 1 | 统一图片索引 |
| `llms.txt` | 1 | 全量聚合（所有语言所有子站）|
| `llms-{locale}.txt` | 51 | 分语言 LLM 文件 |
| `search-index-{locale}.json` | 51 | 统一搜索索引（各站 CDN 共享）|
| `robots.txt` | 1 | AI crawler 声明 + sitemap/llms 引用 |

## 测试

```bash
# 本地访问
curl -sL -o /dev/null -w "%{http_code}\n" http://localhost:3002/en/
curl -sL -o /dev/null -w "%{http_code}\n" "http://localhost:3003/en/c/"
curl -sL -o /dev/null -w "%{http_code}\n" "http://localhost:3004/en/"

# 线上验证
curl -sL -o /dev/null -w "%{http_code}\n" https://tc-web-site.pages.dev/en/
curl -sL -o /dev/null -w "%{http_code}\n" https://tc-web-site.pages.dev/en/c/
curl -sL -o /dev/null -w "%{http_code}\n" https://tc-web-site.pages.dev/en/blog/

# 浏览器对比（见 browser-automation skill）
```

---

## 官网翻译流程

翻译引擎调用 `/root/projects/tool/translate/`：

```python
import sys; sys.path.insert(0, "/root/projects/tool/translate")
from lib.translation_engine import TranslationEngine
engine = TranslationEngine(caller="sinotradecompliance")
result = engine.translate_json(json_str, tgt=locale)
result = engine.translate(mdx_content, tgt=locale)      # blog MDX
```

配额查看：
```bash
source /root/projects/.venv/bin/activate
cd /root/projects/tool/translate && python scripts/translate.py quota
```

### 翻译二次检查

1. **自动化验证**：`npx next build` 确认 0 error、48 语言全部生成、无 `__next_error__`
2. **人工抽查**（A 级语言：zh/ja/ko/ar/fr/es/de/ru）：Navbar/Footer 短词、人名保持英文、按钮文案
3. **Key 对齐确认**：用 Python 脚本验证 48 个 `messages/*.json` key 集合是否与 en.json 一致

---

## 官网 — 新增博客文章

> **已迁移（2026-08-14）：** 博客文章统一在 `apps/blog/content/` 管理，完整流程见下方「[Blog — 添加新文章完整工作流](#blog--添加新文章完整工作流)」。
>
> 流程变更：**不再用 t-translate 机器翻译 47 语言**，改为 **48 语言个性化本地化撰写（不用翻译工具）**，每个语言按目标读者习惯单独撰写，而非直译。
>
> 旧路径 `apps/site/content/blog/` 已废弃（site 目录不再有博客内容）。

---

## Portal — Creem 支付接入

### 1. 在 Creem 创建产品

**Product 1: Single Report** — $1 (One-time)
**Product 2: Monthly Subscription** — $9.9/mo (Recurring)

创建后拿到两个 `product_id`

### 2. 配置 Webhook

Dashboard → Developers → Webhooks → Add Endpoint
- **URL：** `https://sinotradecompliance.com/api/payment/webhook`
- **监听事件：** `checkout.completed`, `subscription.created`, `subscription.cancelled`

### 3. 配置环境变量

在 CF Pages Dashboard → tc-web-portal → Settings → Environment Variables 添加：
```
CREEM_API_KEY=***
CREEM_WEBHOOK_SECRET=***
CREEM_PRODUCT_ID_SINGLE=prod_xxx
CREEM_PRODUCT_ID_SUBSCRIBE=prod_xxx
```

### 4. 支付流程

```
用户点"Full Report — $1"
  → POST /api/checkout 创建 Creem 会话
  → 返回 checkout_url，用户跳转 Creem 支付页
  → 用户填卡付款
  → Creem 回调 success_url（前端跳转）
  → Creem 异步发送 Webhook → /api/payment/webhook
  → Webhook 触发报告生成（PDF 生成 → 上传 → 邮件发送 → D1 更新）
```

Creem 提供 Test Mode：API 端点是 `https://test-api.creem.io`
测试卡号：Creem 文档提供的测试卡

---

## Blog — 添加新文章完整工作流

> **当前流程（2026-08-14 起）：** 48 语言个性化本地化撰写，**不用 t-translate 翻译工具**。
> 参考实施：`gacc-decree-280`（8740d3e6，48 语言全人工本地化，576 文件 0 错误）。

### Step 1: 写英文原文

在 `apps/blog/content/en/` 下创建 `{slug}.mdx`。gray-matter 前置元数据：

```yaml
---
title: "Article Title"
slug: "{slug}"
category: "Food & Beverage"     # 影响底部 CTA 卡片映射（支持中英文双套）
date: "2026-08-14"              # 48 语言必须一致（R10）
excerpt: "SEO description..."
references:                      # 可选
  - title: "Source Name"
    url: "https://..."
---
```

注意：
- title 不超过 55 字符（SEO 截断，宽字符语言更要控制）
- 标题禁止含冒号/破折号/`-`（R08）
- excerpt 含引号时外层改用单引号包裹（YAML 双引号嵌套坑）
- 粗体未闭合：每行 `**` 数量为偶数

### Step 2: 确认 Category 映射

| category（英文 / 中文） | 服务映射 |
|----------|---------|
| Food & Beverage / 食品及饮料 | /services/gacc |
| Label Compliance / 标签合规性 | /services/label |
| Product Certification / 产品认证 | /services/ccc |
| Cosmetics / 化妆品 | /services/cosmetics |
| E-commerce / 电子商务 | /services/ecommerce |
| Brand Protection / 品牌保护 | /services/brand |
| Compliance Guide / 合规指南 | /services/gacc |

映射表在 `apps/blog/src/app/[locale]/blog/[slug]/page.tsx` 的 `CATEGORY_SERVICE_MAP`（含中英文双套 key）。不在表中的 category 必须先在映射表中添加条目。

### Step 3: （可选）添加 FAQPage JSON-LD

在 `[slug]/page.tsx` 的 `FAQ_NS` 映射表中添加 slug 条目，并在 `apps/blog/messages/{locale}.json` 定义 `BlogFaqXxx` namespace。

### Step 4: 48 语言个性化本地化撰写（核心步骤，不用翻译工具）

为全部 48 个语言目录各创建 `apps/blog/content/{locale}/{slug}.mdx`，**每个语言个性化撰写，不是机器直译**：

- **按目标读者习惯撰写**：句式、用词、案例叙述贴合该语言读者的表达习惯，不逐句对应英文版
- **标题本地化**：各语言本地化标题，**不加括号说明**（如不加「（中文版）」）
- **本地化 SEO/GEO**：excerpt 按语言重写，参考文献标题逐语言翻译（R20：非英文语种 ref 标题不得与英文版完全相同）
- **文末 CTA**：`[Contact us](/{locale}/packages/) ...`，语言前缀必须与文章语言一致（R21），链接文本用简短联系短语（R19）
- **date 一致**：48 语言 `date` 与英文版相同（R10）
- **内容红线**：不提价格/官方免费、不写客户自助注册教程（按文章主题确认）

推荐分批用子代理并行撰写（参考 8740d3e6）：

| 批次 | 语言 |
|------|------|
| 批 A 欧西 6 | es fr de it pt nl |
| 批 B 北欧东欧 14 | sv no da fi pl cs ro hu bg hr sr sk sl uk ru |
| 批 C 中东南亚 14 | ar he fa ur hi bn ta si ne ka hy az sq be |
| 批 D 亚太 9 | ja ko vi th id ms sw af ca |
| 手动补写 | el tr（分批清单易遗漏，收尾时核对 48 语言齐全） |

### Step 5: MDX 内容质量检查（本地）

```bash
cd apps/blog
node ../../packages/scripts/check-md-article.mjs --project=blog --ci
```

全量 48 语言必须 0 错误（R01-R21，重点规则）：
- **R07**：文章在全部 48 个语言中都有版本
- **R10**：48 语言 date 一致
- **R20**：非英文语种参考文献标题已翻译（不得与英文版相同）
- **R21**：文末 CTA 链接语言前缀与文章语言匹配

### Step 6: 构建验证

```bash
cd apps/blog
npm run build
# = build-search-index → rm -rf .next/cache → next build → ci-check.mjs --out-dir=out --ci
```

### Step 7: 推送到 main → 自动部署

```bash
git add apps/blog/content/
git commit -m "feat(blog): add {slug} article in 48 languages"
git push origin main
```

### Step 8: 部署验证

| 检查项 | URL |
|---|---|
| 开发环境 | `https://tc-web-blog.pages.dev/en/blog/{slug}/` |
| 生产环境 | `https://sinotradecompliance.com/en/blog/{slug}/` |
| 非英语抽检 | `https://sinotradecompliance.com/zh/blog/{slug}/`（建议多抽几门语言） |

---

## Admin — 部署与 Analytics Cron Worker

### 手动部署（备用）

```bash
cd apps/admin
npm run build     # = next build && bash scripts/postbuild.sh
npx wrangler pages deploy out --project-name tc-web-admin --branch main
```

### 验证部署

```bash
curl -s -o /dev/null -w "%{http_code}" "https://tc-web-admin.pages.dev/admin/dashboard/"
curl -s -o /dev/null -w "%{http_code}" "https://sinotradecompliance.com/admin/dashboard/"
```

### Analytics Cron Worker

独立 Worker 用于定时同步 CF Analytics → D1（cron: `0 * * * *` UTC）。

**文件结构：**
```
apps/admin/workers/analytics-cron/
├── package.json
├── wrangler.toml      # D1 binding + cron
└── src/index.ts
```

**首次部署：**
```bash
cd apps/admin/workers/analytics-cron
source ~/.openclaw/.env
echo "$CLOUDFLARE_API_TOKEN" | npx wrangler secret put CLOUDFLARE_API_TOKEN
echo "$CLOUDFLARE_ZONE_ID" | npx wrangler secret put CLOUDFLARE_ZONE_ID
npx wrangler deploy
```

**修改代码后部署：**
```bash
cd apps/admin/workers/analytics-cron
npx wrangler deploy
# Secrets 保留在 Worker 中，只需重新 deploy 代码
```
