# trade-web 标准操作流程

## 本地开发

```bash
# 安装依赖
cd /root/projects/trade/web
npm install

# 同时启动两个站
npm run dev

# 或单独启动
npm run dev:site     # 主站 → localhost:3002
npm run dev:portal   # Portal → localhost:3003（用 /en/c/ 访问）
```

## 构建验证

```bash
# 全部构建
npm run build

# 单独构建
cd apps/site && npx next build
cd apps/portal && npx next build
cd apps/admin && npx next build
```

## 部署

### CF Pages 配置（首次）
1. 登录 Cloudflare Dashboard → Pages
2. 项目 → Settings → Build configuration
3. 设置 Root directory：
   - 主站：`apps/site`
   - Portal：`apps/portal`
   - Admin：`apps/admin`
4. Build command：`npx next build`
5. Build output：`.next`
6. 保存

### Portal D1 配置
1. CF Dashboard → Workers & Pages → compli-service → Settings → Functions
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

### 默认触发部署
- 推送到 `main` 分支触发自动部署
- 改 `apps/site/**` + `packages/ui/**` → 触发主站
- 改 `apps/portal/**` + `packages/ui/**` → 触发 Portal
- 改 `packages/ui/**` → 触发两站

## 测试

```bash
# 本地访问
curl -sL -o /dev/null -w "%{http_code}\n" http://localhost:3002/en/
curl -sL -o /dev/null -w "%{http_code}\n" "http://localhost:3003/en/c/"
curl -sL -o /dev/null -w "%{http_code}\n" "http://localhost:3003/en/c/check/gacc"

# 浏览器对比（见 browser-automation skill）
```
