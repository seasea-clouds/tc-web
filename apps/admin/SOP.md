# Admin SOP — 部署与发布流程

## 自动构建（GitHub → CF Pages）

Admin 项目已接入 CF Pages 自动构建。

- **触发条件**：向 `main` 分支推送代码（匹配 `apps/admin/**` 或 `packages/ui/**` 等）
- **构建命令**：`npm run build`（= `next build && bash scripts/postbuild.sh`）
- **输出目录**：`out/`
- **根目录**：`apps/admin`

推送后约 1-2 分钟自动部署完成，可通过以下方式验证：

```bash
# 1. 检查最新部署状态
npx wrangler pages deployment list --project-name trade-web-admin

# 2. 检查 API
curl -s "https://trade-web-admin.pages.dev/api/admin/auth/me"

# 3. 检查页面
curl -s -o /dev/null -w "%{http_code}" "https://trade-web-admin.pages.dev/admin/dashboard/"

# 4. 验证主站代理
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

## 环境变量（CF Pages Dashboard → trade-web-admin → 设置 → 环境变量）

| 变量名 | 说明 | 状态 |
|--------|------|------|
| `ADMIN_JWT_SECRET` | JWT 签名密钥 | ✅ 已配置 |
| `TURNSTILE_SECRET_KEY` | Turnstile 人机验证密钥 | ✅ 已配置（site key: `0x4AAAAAADqoEtL5oqrpaf3R`） |
| `NODE_VERSION` | Node.js 版本（preview） | ✅ 22 |
