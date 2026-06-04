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
