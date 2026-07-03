# trade-web 标准操作流程

## 本地开发

```bash
# 安装依赖
cd /root/projects/trade/web
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
| 主站 | `trade-web-site` | `apps/site` | sinotradecompliance.com | trade-web-site.pages.dev |
| Portal | `trade-web-portal` | `apps/portal` | — | trade-web-portal.pages.dev |
| Blog | `trade-web-blog` | `apps/blog` | — | trade-web-blog.pages.dev |

**当前阶段：** 开发模式，使用 CF 自带的 `.pages.dev` 域名。未来将 `sinotradecompliance.com` CNAME 到 `trade-web-site.pages.dev` 后手动切换。

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
2. **❌ wrangler CLI 直接部署：** 使用 `npx wrangler pages deploy ./out --project-name=trade-web-portal` 会因 Worker 超限失败。

**紧急回滚（如用无 Functions 的部署覆盖了生产环境）：**
```bash
# 1. 找到最近的 GitHub auto-build deployment ID
npx wrangler pages deployment list --project-name=trade-web-portal | grep -v "Failure"

# 2. 通过 CF API 回滚到该 deployment
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/trade-web-portal/deployments/${DEPLOYMENT_ID}/rollback" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

**解决方法（规划中）：** 升级到 CF Pro Plan（$5/月）可支持 10 MiB Workers。

### 主站代理转发

主站 `functions/_middleware.ts`（CF Pages 边缘 Worker）处理子站代理：

| 模式 | 操作 |
|------|------|
| `/{locale}/c/*` | Worker 转发到 portal（保留 locale 前缀）|
| `/{locale}/blog/*` | Worker 转发到 blog（保留 locale 前缀）|
| `/c/`（裸路径） | Worker 根据浏览器语言 302 → `/{locale}/c/` |
| `/blog/`（裸路径） | Worker 根据浏览器语言 302 → `/{locale}/blog/` |
| `/`（根路径） | Worker 根据浏览器语言 302 → `/{locale}/` |
| `/c/_next/static/*` | Worker 直接 fetch portal 的静态资源 |
| `/blog/_next/static/*` | Worker 直接 fetch blog 的静态资源 |
| `/api/*` | Worker 转发到 portal 的 Pages Functions |

### Portal D1 配置
1. CF Dashboard → Workers & Pages → trade-web-portal → Settings → Functions
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
  → deploy → postdeploy-check (远程 hreflang 验证)

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
curl -sL -o /dev/null -w "%{http_code}\n" https://trade-web-site.pages.dev/en/
curl -sL -o /dev/null -w "%{http_code}\n" https://trade-web-site.pages.dev/en/c/
curl -sL -o /dev/null -w "%{http_code}\n" https://trade-web-site.pages.dev/en/blog/

# 浏览器对比（见 browser-automation skill）
```
