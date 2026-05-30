# SOP.md — 标准操作流程

## 本地开发

```bash
cd /root/projects/trade/compli-service
npm run dev        # 本地开发
npm run build      # 静态构建验证
```

## 部署

### 发布到 Cloudflare Pages

GitHub push master 自动触发 CF Pages 构建部署（~1-2 分钟）。

```bash
git add -A
git commit -m "内容描述"
git push
```

### 代理路由

`sinotradecompliance.com/compli-service/*` → 通过主站 Pages Function `functions/compli-service/[[catchall]].ts` 透明代理到 `compli-service.pages.dev`。

路由去除 `/compli-service` 前缀后转发：
- `/compli-service/check/gacc` → `compli-service.pages.dev/check/gacc`
- `/compli-service/_next/static/xxx.css` → `compli-service.pages.dev/_next/static/xxx.css`

### 初始化 D1

```bash
npx wrangler d1 execute compli-service-db --file=./migrations/001_init.sql
```

---

## 💳 Creem 支付接入流程

### 前提
- 注册 Creem 账号：https://creem.io
- 获取 API Key：Dashboard → Developers → 复制 API Key

### 1. 在 Creem 创建产品

创建两个产品，填写以下信息：

**Product 1: Single Report**

| 字段 | 内容 |
|------|------|
| Name | Single Compliance Report |
| Price | $1 (One-time) |
| Description | Full compliance report for one product. |
| Success URL | `https://sinotradecompliance.com/compli-service/report/success` |
| Cancel URL | `https://sinotradecompliance.com/compli-service/check/gacc` |

> 注意：代码创建 checkout 时会动态覆盖 Success URL，传入真实 report_id。

**Product 2: Monthly Subscription**

| 字段 | 内容 |
|------|------|
| Name | Monthly Compliance Report |
| Price | $9.9/mo (Recurring) |
| Description | Unlimited monthly compliance reports across all 6 modules (GACC, Label, CCC, Cosmetics, E-commerce, Brand). Full reports with PDF download and email delivery. Cancel anytime. |
| Success URL | `https://sinotradecompliance.com/compli-service/dashboard/` |
| Cancel URL | `https://sinotradecompliance.com/compli-service/pricing` |

创建后拿到两个 `product_id`（如 `prod_xxx`）

### 2. 配置 Webhook

Dashboard → Developers → Webhooks → Add Endpoint

- **URL：** `https://sinotradecompliance.com/compli-service/api/payment/webhook`
- **监听事件：**
  - `checkout.completed`
  - `subscription.created`
  - `subscription.cancelled`
- 保存后复制 **Webhook Secret**

### 3. 配置环境变量

在 Cloudflare Pages Dashboard → compli-service → Settings → Environment Variables 添加：

```
CREEM_API_KEY=sk_live_xxx          # 从 Creem Developers 获取
CREEM_WEBHOOK_SECRET=whsec_xxx     # 从 Creem Webhooks 获取
CREEM_PRODUCT_ID_SINGLE=prod_6Id7hR6aFrTWo8QU8I3R30   # $1 单次报告
CREEM_PRODUCT_ID_SUBSCRIBE=prod_1E1qwbxXyeavvgsFlmFrgN # $9.9 月度订阅
```

### 4. 支付流程

```
用户点"Full Report — $1"
  → POST /api/checkout 创建 Creem 会话
  → 返回 checkout_url，用户跳转 Creem 支付页
  → 用户填卡付款
  → Creem 回调 success_url（前端跳转）
  → Creem 异步发送 Webhook → /api/payment/webhook
  → Webhook 触发报告生成：
     1. @react-pdf 生成 PDF
     2. PDF 上传 R2
     3. Resend 发送邮件（含 PDF 附件）
     4. D1 更新报告状态
  → 用户看到网页报告 + 下载 PDF + 收到邮件
```

### 5. 验证

Creem 提供 Test Mode，用测试 key 开发：API 端点是 `https://test-api.creem.io`

- 测试卡号：Creem 文档提供的测试卡
- 生产切换：将 API 端点改为 `https://api.creem.io`，用正式 key

### API 参考

| 操作 | 方法 | 端点 |
|------|------|------|
| 创建 Checkout | POST | `/v1/checkouts` |
| 创建订阅 | POST | `/v1/subscriptions` |
| 查询 | GET | `/v1/checkouts/{id}` |
| API 基础 URL | 测试 `https://test-api.creem.io` / 正式 `https://api.creem.io` |
| 认证 | Header `x-api-key: sk_live_xxx` |
