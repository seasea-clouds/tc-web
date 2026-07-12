# Admin SOP — 部署与发布流程

## 自动部署（CF Pages 原生 GitHub 集成）

Admin 通过 CF Pages 原生构建自动部署，与 site/portal/blog 相同。

- **触发条件**：向 `main` 分支推送代码时自动触发
- **构建命令**：`npm run build`（= `next build && bash scripts/postbuild.sh`）
- **输出目录**：`out/`
- **根目录**：`apps/admin`
- **构建时间**：约 40 秒

### 验证部署

推送后查看 GitHub Actions 运行结果，或通过以下命令验证：

```bash
# 检查 API
curl -s "https://trade-web-admin.pages.dev/api/admin/auth/me"

# 检查页面
curl -s -o /dev/null -w "%{http_code}" "https://trade-web-admin.pages.dev/admin/dashboard/"

# 验证主站代理
curl -s -o /dev/null -w "%{http_code}" "https://sinotradecompliance.com/admin/dashboard/"
curl -s -X POST "https://sinotradecompliance.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"***"}' | head -c 100
```

## 手动部署（备用）

如果自动构建异常，可手动部署：

```bash
cd /root/projects/trade/web/apps/admin
NODE_ENV=production npm run build
npx wrangler pages deploy out --project-name trade-web-admin --branch main
```

## 定时任务 — Analytics Cron 独立 Worker

CF Pages Functions 的 `_scheduled.ts` 无法可靠注册 cron schedule，改用独立 Worker。

### 文件结构（备份在 GitHub）

```
apps/admin/workers/analytics-cron/
├── package.json
├── wrangler.toml      # D1 binding + cron: 0 * * * *
└── src/index.ts       # 定时同步 CF Analytics → D1
```

### 首次部署

```bash
cd /root/projects/trade/web/apps/admin/workers/analytics-cron

# 1. 设置 secrets（仅首次）
source ~/.openclaw/.env
echo "$CLOUDFLARE_API_TOKEN" | npx wrangler secret put CLOUDFLARE_API_TOKEN
echo "$CLOUDFLARE_ZONE_ID" | npx wrangler secret put CLOUDFLARE_ZONE_ID

# 2. 部署
npx wrangler deploy
```

### 修改代码后部署

```bash
cd /root/projects/trade/web/apps/admin/workers/analytics-cron
npx wrangler deploy
```

⏱ 约 3 秒完成，无需等待 CF Pages 构建队列。
Secrets 保留在 Worker 中，只需重新 deploy 代码。

### GitHub Actions 自动部署（可选）

如有需要可添加 workflow 文件，实现 git push 时自动 `wrangler deploy`：

```yaml
# .github/workflows/deploy-analytics-cron.yml
name: Deploy Analytics Cron
on:
  push:
    branches: [main]
    paths: ['apps/admin/workers/analytics-cron/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx wrangler deploy
        working-directory: apps/admin/workers/analytics-cron
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 手动触发验证

Worker 只导出 `scheduled` handler，无 HTTP 端点。通过 D1 数据变化确认触发：

```bash
source ~/.openclaw/.env
ACCOUNT_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts" | python3 -c \
  'import sys,json; print(json.load(sys.stdin)["result"][0]["id"])')
DB_ID=""

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database/$DB_ID/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT date, hour, pv, uv FROM hourly_page_stats WHERE date = \"2026-07-12\" ORDER BY hour"}'
```

## 环境变量

### CF Pages 环境变量

Dashboard → trade-web-admin → 设置 → 环境变量

| 变量名 | 说明 | 状态 |
|--------|------|------|
| `ADMIN_JWT_SECRET` | JWT 签名密钥 | ✅ 已配置 |
| `TURNSTILE_SECRET_KEY` | Turnstile 人机验证密钥 | ✅ 已配置（site key: `0x4AAAAAADqoEtL5oqrpaf3R`） |
| `NODE_VERSION` | Node.js 版本（preview） | ✅ 22 |

### Standalone Worker Secrets

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_ZONE_ID
```
