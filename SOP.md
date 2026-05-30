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

### 新建 CF Pages 项目（连接到 GitHub）

有两种方式创建 CF Pages 项目并连接到 GitHub 仓库：

#### 方式 A：Cloudflare Dashboard（推荐首次）
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. 选 **Pages** → **连接到 Git** → 授权 GitHub 账号
3. 选择 `seasea-clouds/trade-web` 仓库
4. 项目名：`trade-web-{app}`
5. 配置构建设置：
   | 设置 | 值 |
   |------|-----|
   | 生产分支 | `main` |
   | Root directory | `apps/{app}` |
   | Build command | `npx next build` |
   | Build output | `out` |
6. 点击 **保存并部署**

#### 方式 B：CF API（编程方式）
```python
import json, urllib.request

body = json.dumps({
    "name": "trade-web-{app}",
    "source": {
        "type": "github",
        "config": {
            "owner": "seasea-clouds",
            "repo_name": "trade-web",
            "production_branch": "main",
            "pr_comments_enabled": True,
            "deploy_previews": True,
        }
    },
    "build_config": {
        "build_command": "npx next build",
        "destination_dir": "out",
        "root_dir": "apps/{app}"
    }
}).encode()

req = urllib.request.Request(
    f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects',
    data=body,
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    method='POST'
)
resp = json.loads(urllib.request.urlopen(req).read())
```
> ⚠️ 关键：必须在创建时就传 `source` 字段。如果先创建（Direct Upload）再试图 PATCH 追加 git，API 会拒绝。

#### 方式 C：Wrangler CLI（仅 Direct Upload，无 Git）
```bash
npx wrangler pages project create trade-web-{app} --production-branch main
npx wrangler pages deploy apps/{app}/out --project-name trade-web-{app} --branch main
```
> ⚠️ Wrangler 创建的项目为 Direct Upload 模式，不支持 Git 自动部署。
> 如需 Git 连接，请使用方式 A 或 B。

### 现有 CF Pages 项目

| 项目 | 域名 | Root dir | Git 连接 |
|------|------|----------|:---------:|
| `trade-web-site` | sinotradecompliance.com → trade-web-site.pages.dev | `apps/site` | ✅ |
| `trade-web-portal` | compli-service.pages.dev → trade-web-portal.pages.dev | `apps/portal` | ✅ |
| `trade-web-blog` | trade-web-blog.pages.dev | `apps/blog` | ✅ |
| `trade-web-admin` | 占位 | `apps/admin` | ⏳ |

### 默认触发部署
- 推送到 `main` 分支 → 所有项目自动触发构建
- 改 `apps/site/**` → 触发主站
- 改 `apps/portal/**` → 触发 Portal
- 改 `apps/blog/**` → 触发博客
- 改 `packages/ui/**` → 触发所有站
- 改 `packages/scripts/**` → 触发所有站

### Portal D1 配置
1. CF Dashboard → Workers & Pages → trade-web-portal → Settings → Functions
2. D1 database bindings → 添加绑定
   - Variable name: `DB`
   - Database: 选择或创建 D1 数据库
3. Environments variables → 添加需要的变量

### Portal 环境变量
| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（旧兼容）|
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

所有编译脚本位于 `packages/scripts/`，自动发现 `apps/*` 下所有子站：

| 脚本 | 功能 |
|------|------|
| `discover-routes.mjs` | 自动扫描 page.tsx 发现路由 |
| `build-sitemap.mjs` | 生成多语言 sitemap |
| `build-llms.mjs` | 生成 LLM 发现文件 |
| `build-search-index.mjs` | 生成统一搜索索引 |
| `build-robots.mjs` | 生成 robots.txt |
| `build-all.mjs` | 总入口：运行以上所有脚本 |
| `check-translations.mjs` | 翻译质量检查（全量核验）|
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

**用户站/博客站（简化）：**
```bash
next build \
  ; node ../../packages/scripts/check-translations.mjs --short \
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
curl -sL -o /dev/null -w "%{http_code}\n" https://trade-web-portal.pages.dev/en/c/
curl -sL -o /dev/null -w "%{http_code}\n" https://trade-web-blog.pages.dev/en/

# 博客通过主站代理
curl -sL -o /dev/null -w "%{http_code}\n" https://trade-web-site.pages.dev/en/blog/

# 浏览器对比（见 browser-automation skill）
```
