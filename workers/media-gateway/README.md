# tc-web-media —— 媒体网关（多渠道采集链路的哑存储 Worker）

契约在 CRM 维护的方案包里，本目录只有实现。

## 角色

**只存不解析**：`push` 收信封、`pull` 发未 ack 的、`ack` 删已 ack 的、每日清理。
不合并、不派生字段、不改正文 —— 全在 CRM 侧。

## 对外暴露方式

主域 `https://sinotradecompliance.com/media/<channel>/<win>/(push|pull|ack)` 由
`apps/site/functions/_middleware.ts` 原样转发进来（含 body 字节、`<channel>`/`<win>` 段、状态码），
并注入 `X-MG-Gateway`（网关口令）与 `X-MG-Client-IP`（真实 IP，供限流）。

Worker 自身在 `https://tc-web-media.<account>.workers.dev`，但**没有网关头一律 404**。

## 渠道

`<channel>` 来自环境变量 `MEDIA_CHANNELS`（逗号分隔），当前为 `reddit,x`。
**不在名单内一律 404**，与非法路径同样处理，不提示原因。

以后加渠道：`MEDIA_CHANNELS` 加一项 + `MEDIA_PUBKEYS` 加该渠道的 `script`/`crm` 公钥，改完重新部署。

## 鉴权

ECDSA P-256 + 5 分钟时间窗路径 + nonce 防重放（D1），验签**只收 64 字节 `r||s`**。
签名原文逐字节不变：`METHOD\nPATH\nTS\nNONCE\nDEV\nsha256hex(原始 body 字节)`。
渠道与角色公钥必须匹配（reddit 的钥签 `/media/x/...` → 拒）。
失败一律 `404 {"ok":false}`，不返回 401/403、不给原因。

请求头：`X-MG-Role` / `X-MG-Ts` / `X-MG-Nonce` / `X-MG-Dev` / `X-MG-Sig`；
转发层额外注入 `X-MG-Gateway` / `X-MG-Client-IP`（均不参与签名）。

## 接口

| 端点 | 角色 | 说明 |
|---|---|---|
| `POST /media/<channel>/<win>/push` | script | 收信封；`capture_id` 幂等（渠道内），重复 → `{ok,dup:true,rev}` |
| `GET /media/<channel>/<win>/pull?since_rev=N&limit=M` | crm | 该渠道未 ack 按 rev 升序；`limit` 默认 50、上限 200 |
| `POST /media/<channel>/<win>/ack` | crm | `{capture_ids:[...]}` 幂等；返回 `{acked,rev}` |

所有响应带 `channel` 字段。

`pull` 响应：`{ok, channel, rev, items, has_more}`。

**顶层 `rev` 是游标**（本页最后一条的 rev；空页原样返回 `since_rev`），可以直接当下一轮的 `since_rev`。
它**不能**是全局 `MAX(rev)` —— 那会让 CRM 一次跳到底，没返回的条目永远拉不到。
`ack` 返回的 `rev` 是该渠道 `MAX(rev)`（只用于日志）。

## 存储

D1 `tc-web-media-db`（`migrations/0001-init.sql`）：`media_envelope` / `media_nonce` / `media_rate`。

`rev` 是**全局** `AUTOINCREMENT` 主键（保证单调、不复用、不因删行回退），渠道内过滤后仍然单调。
新渠道的 rev 接着现有最大值继续，不从 1 开始。

`channel` 列 `NOT NULL` 且无默认值：漏传或非法渠道在 Worker 层就已 404，不会写进库。

未 ack 保留 30 天、已 ack 7 天物理删（cron `20 3 * * *`）。

## 配置

| 名称 | 位置 | 说明 |
|---|---|---|
| `DB` | wrangler.toml | D1 binding |
| `MEDIA_PUBKEYS` | Worker secret | `{"<channel>":{"script":{jwk},"crm":{jwk}}}`，只放公钥 |
| `MEDIA_GATEWAY_SECRET` | Worker secret + site 的 Pages 变量 | 两端**同名同值** |
| `MEDIA_CHANNELS` | Worker secret | `reddit,x` |

```bash
set -a && . ../../.env && set +a
npx wrangler secret put MEDIA_PUBKEYS --config workers/media-gateway/wrangler.toml
npx wrangler secret put MEDIA_GATEWAY_SECRET --config workers/media-gateway/wrangler.toml
npx wrangler secret put MEDIA_CHANNELS --config workers/media-gateway/wrangler.toml
npx wrangler deploy --config workers/media-gateway/wrangler.toml
```

## 自测

```bash
node worker_selftest.mjs --endpoint https://tc-web-media.<account>.workers.dev \
     --channel reddit --script-privkey keys/script_private.pem --crm-privkey <…> \
     --gateway "$MEDIA_GATEWAY_SECRET"
```

**坑**：Cloudflare 会拦 `Python-urllib` 默认 UA（403 / error 1010）——Python 客户端必须显式设
`User-Agent`；Node 的 `fetch` 默认 UA 不受影响。
