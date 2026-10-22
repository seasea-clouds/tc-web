# tc-web-reddit —— Reddit 采集链路的哑存储 Worker

契约与施工单在 CRM 维护的方案包里（`01-CONTRACT.md` / `05-WORKER-PLAN.md`），本目录只有实现。

## 角色

**只存不解析**：`push` 收信封、`pull` 发未 ack 的、`ack` 删已 ack 的、每日清理。
不合并、不派生字段、不改正文 —— 全在 CRM 侧。

## 对外暴露方式

主域 `https://sinotradecompliance.com/reddit/<win>/(push|pull|ack)` 由
`apps/site/functions/_middleware.ts` 原样转发进来（含 body 字节、`<win>` 段、状态码），
并注入 `X-RD-Gateway`（网关口令）与 `X-RD-Client-IP`（真实 IP，供限流）。

Worker 自身在 `https://tc-web-reddit.<account>.workers.dev`，但**没有网关头一律 404**。

## 鉴权

ECDSA P-256 + 5 分钟时间窗路径 + nonce 防重放（D1），验签**只收 64 字节 `r||s`**。
失败一律 `404 {"ok":false}`，不返回 401/403、不给原因。

## 接口

| 端点 | 角色 | 说明 |
|---|---|---|
| `POST /reddit/<win>/push` | script | 收信封；`capture_id` 幂等，重复 → `{ok,dup:true,rev}` |
| `GET /reddit/<win>/pull?since_rev=N&limit=M` | crm | 未 ack 按 rev 升序；`limit` 默认 50、上限 200 |
| `POST /reddit/<win>/ack` | crm | `{capture_ids:[...]}` 幂等；返回 `{acked,rev}` |

`pull` 响应：`{ok, rev, items, has_more, next_since_rev}`。
**翻页必须用 `next_since_rev`（本页最后一条的 rev），不要用顶层 `rev`（全局 MAX）** —— 用 `rev`
当 `since_rev` 会一次跳到底，没返回的条目永远拉不到。

## 存储

D1 `tc-web-reddit-db`（`migrations/0001-init.sql`）：`rd_envelope` / `rd_nonce` / `rd_rate`。
未 ack 保留 30 天、已 ack 立即不可见 + 7 天物理删（cron `20 3 * * *`）。

## 配置

| 名称 | 位置 | 说明 |
|---|---|---|
| `DB` | wrangler.toml | D1 binding |
| `REDDIT_PUBKEYS` | Worker secret | `{"script":{jwk},"crm":{jwk}}`，只放公钥 |
| `REDDIT_GATEWAY_SECRET` | Worker secret + site 的 Pages 变量 | 两端**同名同值** |

```bash
set -a && . ../../.env && set +a
npx wrangler secret put REDDIT_PUBKEYS        # 内容 = 方案包 keys/pubkeys.json
npx wrangler secret put REDDIT_GATEWAY_SECRET # 内容 = .env 里的 REDDIT_GATEWAY_SECRET
npx wrangler deploy
```

## 自测

用方案包里的 `appendix/worker_selftest.{py,mjs}` 打部署：

```bash
node worker_selftest.mjs --endpoint https://tc-web-reddit.<account>.workers.dev \
     --script-privkey keys/script_private.pem --crm-privkey <自造或 CRM 提供> \
     --gateway "$REDDIT_GATEWAY_SECRET"
```

**坑**：Cloudflare 会拦 `Python-urllib` 默认 UA（403 / error 1010）——Python 客户端必须显式设
`User-Agent`；Node 的 `fetch` 默认 UA 不受影响。
