# Admin SOP — 部署与发布流程

## 手动部署（当前标准流程）

由于 CF Pages 自动构建故障，当前必须手动部署。

```bash
# 1. 构建 Next.js 静态导出
cd /root/projects/trade/web/apps/admin
NODE_ENV=production npx next build

# 2. 部署到 CF Pages
npx wrangler pages deploy out \
  --project-name trade-web-admin \
  --branch main
```

> ⚠️ 构建产物输出到 `out/` 目录（Next.js basePath: `/admin`, output: `export`）

## 自动构建（待修复）

GitHub 自动构建持续失败（`clone_repo` 成功但 `build` 阶段失败，无可用日志）。
如修复后可在推送时自动构建，但仍需手动把 `apps/admin` 设为 CF Pages 项目的 root dir。

## 环境变量（CF Pages Dashboard → trade-web-admin → 设置 → 环境变量）

| 变量名 | 说明 | 来源 |
|--------|------|------|
| `ADMIN_JWT_SECTET` | JWT 签名密钥 | 已配置 |
| `TURNSTILE_SECRET_KEY` | Turnstile 人机验证密钥 | **待配置** — 需从 CF Dashboard → Turnstile → 找到 site key `0x4AAAAAAAewC-TLy6pJ7WgB` 对应的 widget，复制 secret key |

## 验证部署

```bash
# 1. 检查 API
curl -s "https://trade-web-admin.pages.dev/api/admin/auth/me"

# 2. 检查页面
curl -s -o /dev/null -w "%{http_code}" "https://trade-web-admin.pages.dev/admin/dashboard/"

# 3. 验证主站代理
curl -s "https://sinotradecompliance.com/admin/dashboard/" > /dev/null && echo "Proxy OK"
curl -s -X POST "https://sinotradecompliance.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' | head -c 100
```
