# 媒体网关实施计划 v4（web 侧修订版）

> 输入：CRM《媒体网关硬切换实施方案 v3》(2026-10-26)
> 本文是 tc-web 侧的**执行口径**，与 CRM v3 不一致处以本文为准。
> 用户已定：一次性硬切换、不留 `/reddit` 别名、不留任何兼容代码、命名不留 reddit 痕迹。
> 提出：2026-10-26 · 状态：待开工

---

## 0. 相对 CRM v3 的五处改动

| # | CRM v3 | 本版 | 原因 |
|---|---|---|---|
| 1 | 主键改 `(channel, capture_id)`、`UNIQUE(channel, rev)` | 保留 `rev INTEGER PRIMARY KEY AUTOINCREMENT`，`channel` 为普通列 + `UNIQUE(channel, capture_id)` | Worker 靠 `INSERT … last_row_id` 取 rev（`RETURNING` 在 D1 走 `.all()` 拿不到行）。改主键会废掉这条链路，还要在无事务的 D1 上手动分配每渠道 rev |
| 2 | 每渠道 rev 从 1 开始 | rev 全局单调，x 从 reddit 之后继续 | 同上。全局单调 + 按渠道过滤，CRM 水位逻辑等价成立 |
| 3 | `channel` 走 `DEFAULT 'reddit'` 回填 | `channel` **NOT NULL 无默认值**，走重建表 | 用户要求：不得靠默认值掩盖遗漏；不合规入参直接拒绝 |
| 4 | 保留 `X-RD-*` / `REDDIT_*` | 全部改 `X-MG-*` / `MEDIA_*`，用 CF API 改 Pages 环境变量 | 用户要求：不留兼容残留 |
| 5 | 新增 `/media/_health` | **不实现** | 用户明确不要；运维改用 D1 直查 |

另外补上 CRM v3 遗漏的：cron 继承、robots 规则、限流桶按渠道隔离、D1 库名。

---

## 1. 目标形态

```
Worker        tc-web-media            （旧 tc-web-reddit 切换后删除）
D1            tc-web-media-db         （新建，迁 33 条后删旧库 tc-web-reddit-db）
cron          20 3 * * *              （保留期清理，必须跟着搬过去）
对外路由      https://sinotradecompliance.com/media/*
```

路径：

```
POST /media/<channel>/<win>/push     role=script
GET  /media/<channel>/<win>/pull     role=crm   ?since_rev=&limit=
POST /media/<channel>/<win>/ack      role=crm   {"capture_ids":[…],"rev":N}
```

- `<channel>` ∈ `MEDIA_CHANNELS`（`reddit,x`），**不在名单内 → 404**（与非法路径同处理，不做任何提示）
- `<win>` = hex(SHA256("path:" + floor(now/300)))[:16]
- `/reddit/*` 切换后一律 404
- 不提供 `_health`

---

## 2. 数据层

### 2.1 新建 D1

```
wrangler d1 create tc-web-media-db
```

### 2.2 表结构（`migrations/0001-init.sql`）

```sql
-- channel 无默认值：漏传或非法渠道在 Worker 层就已 404，写库时不允许空
CREATE TABLE IF NOT EXISTS media_envelope (
  rev         INTEGER PRIMARY KEY AUTOINCREMENT,
  channel     TEXT    NOT NULL,
  capture_id  TEXT    NOT NULL,
  received_at INTEGER NOT NULL,
  acked_at    INTEGER,
  device      TEXT,
  role        TEXT,
  body        TEXT    NOT NULL,
  UNIQUE (channel, capture_id)
);

CREATE INDEX IF NOT EXISTS media_envelope_pending
  ON media_envelope (channel, rev) WHERE acked_at IS NULL;
CREATE INDEX IF NOT EXISTS media_envelope_acked
  ON media_envelope (channel, acked_at) WHERE acked_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS media_nonce (
  dev        TEXT    NOT NULL,
  nonce      TEXT    NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (dev, nonce)
);
CREATE INDEX IF NOT EXISTS media_nonce_exp ON media_nonce (expires_at);

CREATE TABLE IF NOT EXISTS media_rate (
  k TEXT    PRIMARY KEY,   -- "<channel>:<ip>:<minute>"
  n INTEGER NOT NULL
);
```

### 2.3 数据迁移（`migrations/0002-import-reddit.sql`，一次性的）

```sql
INSERT INTO media_envelope (rev, channel, capture_id, received_at, acked_at, device, role, body)
SELECT rev, 'reddit', capture_id, received_at, acked_at, device, role, body
FROM tc_web_reddit_db.rd_envelope;   -- 实际执行时按 2.4 的方式跨库导出/导入
```

D1 不支持跨库直查，实际做法：

```bash
# 1) 导出
wrangler d1 execute tc-web-reddit-db --remote \
  --command "SELECT rev, capture_id, received_at, acked_at, device, role, body FROM rd_envelope ORDER BY rev" \
  --json > /tmp/reddit-envelope.json
# 2) 生成 INSERT 语句（脚本拼 SQL，body 用单引号转义）
# 3) 导入
wrangler d1 execute tc-web-media-db --remote --file /tmp/import.sql
# 4) 校验 rev 连续、条数一致、MAX(rev) 一致
```

`AUTOINCREMENT` 的序列表在显式写入更大 rev 时会自动更新到该值，无需手工维护 `sqlite_sequence`；导入后仍需核对 `MAX(rev)`。

---

## 3. 代码层

### 3.1 目录

```
workers/reddit-worker/  →  workers/media-gateway/
```

### 3.2 常量与校验

```ts
const CHANNELS = new Set((env.MEDIA_CHANNELS || '').split(',').map(s => s.trim()).filter(Boolean));
const PATH_RE = /^\/media\/([a-z][a-z0-9_-]{0,31})\/([0-9a-f]{16})\/(push|pull|ack)\/?$/;
```

校验顺序（与现版一致，只换名）：

1. `X-MG-Gateway` ≠ `MEDIA_GATEWAY_SECRET` → 404（不查库）
2. 路径不匹配 → 404
3. `channel` 不在 `CHANNELS` → 404
4. 方法不匹配 → 404
5. `<win>` ≠ 当前/上一窗口 → 404
6. `X-MG-Ts` / `X-MG-Nonce` / `X-MG-Dev` / `X-MG-Role` / `X-MG-Sig` 校验 → 404
7. 渠道与角色公钥不匹配（reddit 钥签 x 路径）→ 404

签名原文逐字节不变：`METHOD\nPATH\nTS\nNONCE\nDEV\nsha256hex(原始 body 字节)`。
`X-MG-Client-IP` 由转发层注入，只用于限流，不参与签名。

### 3.3 写库

```ts
const ins = await env.DB.prepare(
  'INSERT INTO media_envelope (channel, capture_id, received_at, device, role, body) VALUES (?,?,?,?,?,?) ON CONFLICT(channel, capture_id) DO NOTHING'
).bind(channel, captureId, now, dev, role, body).run();

const rev = ins.meta.last_row_id;   // 仍是 rev，因为 rev 仍是有序主键
```

### 3.4 限流

`media_rate.k = "<channel>:<ip>:<minute>"` → 每渠道独立 60/min。

### 3.5 删除的东西

- `PREFIX = '/reddit'` → `/media`
- 所有 `X-RD-*` → `X-MG-*`
- `env.REDDIT_PUBKEYS` → `env.MEDIA_PUBKEYS`
- `env.REDDIT_GATEWAY_SECRET` → `env.MEDIA_GATEWAY_SECRET`
- 无 `_health` 分支

---

## 4. 配置层

### 4.1 Worker env（secrets）

| 名 | 来源 |
|---|---|
| `MEDIA_PUBKEYS` | 原 `REDDIT_PUBKEYS`（值不变，reddit 键对沿用） |
| `MEDIA_GATEWAY_SECRET` | 原 `REDDIT_GATEWAY_SECRET`（值不变） |
| `MEDIA_CHANNELS` | 新增，`reddit,x` |

```bash
set -a && . ./.env && set +a
npx wrangler secret put MEDIA_PUBKEYS --config workers/media-gateway/wrangler.toml
npx wrangler secret put MEDIA_GATEWAY_SECRET --config workers/media-gateway/wrangler.toml
npx wrangler secret put MEDIA_CHANNELS --config workers/media-gateway/wrangler.toml
```

### 4.2 Pages 环境变量（site 项目）

| 旧 | 新 |
|---|---|
| `REDDIT_GATEWAY_SECRET` | `MEDIA_GATEWAY_SECRET` |
| `UPSTREAM_REDDIT` | `UPSTREAM_MEDIA` |

用 CF API 走 PATCH（merge 语义，不动其它变量）：

```bash
ACC=f4c6ce66c3dd07c11547fd610c4bb891
PROJ=tc-web-site
# ① 先 GET，导出当前变量名清单存档（secret_text 值读不到）
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACC/pages/projects/$PROJ" > /tmp/pages-env-before.json
# ② PATCH 新增改名后的两个变量（值从 .env 取；secret_text 用 "type":"secret_text"）
# ③ 再次 GET 确认两项已存在，且其余变量数量未减
```

改完必须核对变量总数不变——secret_text 一旦被 PATCH 覆盖就会变空值，会导致全站 404。

### 4.3 robots

`packages/scripts/build-robots.mjs`：`Disallow: /reddit/` → `Disallow: /media/`。

### 4.4 site 中间件

`apps/site/functions/_middleware.ts`：

- 删除 `/reddit/*` 分支
- 新增 `/media/*` 分支，注入 `X-MG-Gateway` 与 `X-MG-Client-IP`
- `UPSTREAM_MEDIA` 默认值改 `https://tc-web-media.sea-clouds.workers.dev`

---

## 5. 切换步骤

用户已定：**不担心切换窗口的数据丢失**，因此不做过渡窗口设计，只保留脚本本地存包这一既有兜底。

### T-1（准备，不接流量）

1. `wrangler d1 create tc-web-media-db` + 建表 + 迁 33 条 + 校验 rev
2. Worker 代码改造完，`wrangler deploy`（此时 workers.dev 直连可测，主域还没指向它）
3. secrets 就位，`workers.dev` 直连跑通 push/pull/ack/跨渠道隔离
4. Pages 环境变量改名（CF API），GET 存档
5. robots 改动提交（随下一次站点部署生效）

### T0（切点，一次推送）

1. 推送站点改动（middleware `/media/*`）→ CF Pages 构建部署
2. 等站点部署完成（`wrangler pages deployment list` 看最新批次 Success）
3. 交付脚本 `reddit-capture v1.7.2`（CRM 侧安装）
4. 确认主域 `/media/...` 已通、`/reddit/...` 已 404

### T+1h

`wrangler delete tc-web-reddit`（确认无流量后）
`wrangler d1 delete tc-web-reddit-db`（确认新库校验通过后）

---

## 6. 验收

| 编号 | 检查 | 方式 |
|---|---|---|
| G1 | 数据完整 | `wrangler d1 execute tc-web-media-db --remote --command "SELECT channel, COUNT(*) n, MAX(rev) mx, SUM(acked_at IS NULL) pending FROM media_envelope GROUP BY channel"` → reddit 33 条 / maxrev 322 / pending 0 |
| G2 | reddit pull 验签 | CRM `reddit health --probe` |
| G3 | reddit sync dry-run | CRM `reddit sync` 无 auth 错误 |
| G4 | 老路径死透 | `POST /reddit/<win>/push` → 404 |
| G5 | 旧头不再接受 | 带 `X-RD-Sig` 请求 → 404 |
| G6 | 跨渠道隔离 | reddit 钥签 `/media/x/...` → 404；反之亦然 |
| G7 | x 渠道 | script 钥 push 最小信封 → `{ok:true,rev:N}`；重推 → `dup:true` |
| G8 | 补推通道 | CRM `reddit ingest --file <样例>` 入库成功 |
| G9 | robots | 线上 `/robots.txt` 含 `Disallow: /media/`，不含 `/reddit/` |
| G10 | rev 连续 | `SELECT COUNT(*) FROM media_envelope WHERE channel='reddit'` = `MAX(rev) - MIN(rev) + 1`（33 条、rev 290–322 时成立） |
| G11 | cron 生效 | `wrangler deployments` 显示 cron；或等次日 03:20 查日志 |
| G12 | pages.dev 直连 | `POST https://tc-web-blog.pages.dev/reddit/...` → 404 |

---

## 7. 回滚

1. `wrangler rollback` 回到上一版 Worker（或重新部署 git 里上一版）
2. 站点 middleware 恢复 `/reddit/*` 转发 + Pages 环境变量改回旧名
3. 脚本回退 v1.7.1

D1 未被破坏（rev 只增），数据无损。旧库在 T+1h 前不删，回滚可直接切回。

---

## 8. 墓碑清理核查（实施完必须跑）

```bash
# 代码 / 文档 / 配置里不应再出现这些（docs/reddit-plan-v2/ 历史方案包除外）
rg -n "X-RD-|REDDIT_PUBKEYS|REDDIT_GATEWAY_SECRET|UPSTREAM_REDDIT|rd_envelope|rd_nonce|rd_rate|tc-web-reddit|reddit-worker" \
  --glob '!docs/reddit-plan-v2/**' --glob '!node_modules/**'

# 线上核查
curl -s https://sinotradecompliance.com/robots.txt | grep -i media
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://sinotradecompliance.com/reddit/0000000000000000/push
```

`workers/README.md`、`MEMORY.md`、`NOTES.md` 里的 Worker 名/路径同步更新。

---

## 9. 工作量

| 项 | 估时 |
|---|---|
| D1 建库建表迁移校验 | 0.5h |
| Worker 改造（改名 + channel 参数化 + 限流隔离） | 2h |
| 中间件 + robots + 文档 | 0.5h |
| Pages env 改名（CF API） | 0.5h |
| workers.dev 直连自测 G4–G8、G10 | 1h |
| T0 值守 + 线上验收 G1–G12 | 1h |
| 合计 | **约 5.5h（半天）** |

---

## 10. 待 CRM 确认

1. `reddit-capture v1.7.2` 的 sha256 与路径前缀 `/media/reddit`（§9 已给，安装前再核一次）
2. CRM 侧 rev 水位是否容忍 x 渠道不从 1 开始（本版为全局单调）
3. `crm.py reddit …` 子命令是否也要改名（本版不动，属 CRM 侧自由）
