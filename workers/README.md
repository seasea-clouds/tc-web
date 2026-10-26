# Workers —— 独立 Worker 清单与统一约定

本仓库目前有**两个**独立 Worker（都不是 Pages Functions，deploy 各自跑 `wrangler deploy`）。

---

## 1. 清单

| Worker | 目录 | 触发 | 干什么 |
|---|---|---|---|
| `tc-web-portal-email-cron` | `apps/portal/workers/email-cron/` | cron `*/5 * * * *` + `GET /health`、`GET /run` | 每 5 分钟调 portal 的 `POST /api/report/drain`，把已审核的报告邮件投出去 |
| `tc-web-media` | `workers/media-gateway/` | cron `20 3 * * *` + `/media/<channel>/<win>/{push,pull,ack}` | 多渠道采集信封的**哑存储**：收 / 发未 ack / 删已 ack / 每日清理（当前渠道 `reddit`、`x`） |

---

## 2. 为什么必须独立 Worker（共同理由）

Cloudflare **Pages Functions 不支持 cron trigger** —— `_scheduled.ts` 导出的 `scheduled` 永远不会被注册，
只有 Worker 的 `[triggers] crons` 才真正按计划跑。凡是「后台定时」或「需要独立于某个 app 生命周期」
的东西，都只能落到独立 Worker 上。

---

## 3. 共同的架构约定（两个 Worker 都遵守）

1. **零依赖单文件 TS**：不引 npm 包（D1 类型也自己写最小接口），靠 wrangler esbuild 打包。
2. **弱口令共享**：不在 Worker 里另建一套鉴权体系，而是复用「同名同值口令」——
   `CREEM_WEBHOOK_SECRET`（email-cron ↔ portal）、`MEDIA_GATEWAY_SECRET`（media ↔ site 转发层）。
   两端**同名同值**，改一处必须同时改另一处。
3. **不对外直连**：email-cron 只被 cron / 带口令的手动 curl 调；media 对外只经主域 `/media/*` 转发，
   直连 `*.workers.dev` 缺网关头一律 404。
4. **结构化日志、不打敏感正文**：`console.log(JSON.stringify({svc, ev, status, ...}))`，
   正文/私钥/口令一律不进日志。
5. **可重试、幂等**：email-cron 的 drain 本身幂等（已发状态落库）；media 用渠道内 `capture_id` 幂等 +
   全局 `rev` 单调递增。
6. **部署即验证**：deploy 之后必须真打一次（email-cron `/health`、media `push` 200 + 直连 404）。

---

## 4. 逐项对比

| 维度 | `tc-web-portal-email-cron` | `tc-web-media` |
|---|---|---|
| 定位 | **触发器 + 代理**：自己不存东西，只按点调 portal | **存储端点**：自己存、自己发、自己删 |
| 有无状态 | 无（状态都在 portal 的 D1 `email_queue`） | 有（自己的 D1 `tc-web-media-db`） |
| 触发器 | cron 每 5 分钟 + fetch 两个运维端点 | cron 每天 03:20（清理）+ 三个业务端点 |
| 鉴权 | 单一弱口令 `x-stc-internal`（= portal 的 `CREEM_WEBHOOK_SECRET`） | 两道：① 网关头 `X-MG-Gateway`（弱口令）② **ECDSA P-256 签名** + 5 分钟时间窗 + nonce 防重放 + 渠道↔角色公钥绑定 |
| 对外暴露方式 | 直接打 `*.workers.dev`（内部工具，口令即门） | 主域 `sinotradecompliance.com/media/*` 由 site 的边缘 middleware **原样透传**（含 body 原始字节、`<channel>`/`<win>` 段、状态码），并注入 `X-MG-Client-IP` |
| 失败语义 | **给你真实错误**：`{ok:false, status, body}` —— 排障优先 | **一律 404 `{"ok":false}`**：不区分"没签名"和"签名错"，不给探测者任何信息 |
| 边界防护 | 无（`limit` 夹在 1–50） | 2 MB body → 413；未 ack 队列 5000 → 429；**每渠道**每 IP 60 次/分 → 429；`X-MG-Ts` ±300 s；nonce 600 s |
| 数据保留 | 无（portal 侧管） | 未 ack 30 天；已 ack 立即不可见 + 7 天物理删 |
| 幂等键 | `email_queue` 的状态迁移 | `(channel, capture_id)`（`ON CONFLICT DO NOTHING` → 冲突即 `dup`） |
| 目录位置 | `apps/portal/workers/email-cron/` | `workers/media-gateway/`（**必须在 `apps/` 之外**，见 §5） |
| 本地依赖 | 无 | 无 |
| 手动排障 | `curl -H "x-stc-internal: $SECRET" .../run?limit=20`、`/health` | `appendix/worker_selftest.{py,mjs}` 16 例（**Python 必须设 UA**，见 NOTES 踩坑 21） |

**结论**：套路同源（零依赖单文件 + 共享口令 + 独立 deploy + cron），但**规则松紧完全不同**——
email-cron 是内部定时器，错误要越清楚越好；media 是对外机器接口，错误要越模糊越好，且必须自己管状态、
自己做重放防护。**不要照抄对方的失败语义。**

---

## 5. 一个必须知道的口径差异

media 的 `pull` 响应顶层 `rev` 是**游标**（该渠道本页最后一条的 rev；空页原样返回 `since_rev`），
不是该渠道的 `MAX(rev)`。原因：契约写明「CRM 用它当水位（`pull-state` 落盘）」，
若返回 `MAX` 会让 CRM 一次跳到底，没返回的条目**永远**拉不到。
`ack` 返回的 `rev` 才是该渠道 `MAX`（只用于日志）。

`rev` 是**全局** `AUTOINCREMENT`（跨渠道共享一个序列），所以新渠道的 rev 接着现有最大值继续，
不从 1 开始 —— 单调性跨渠道成立，渠道内过滤后仍然单调。

---

## 6. CI 陷阱：Worker 放哪里

`packages/scripts/ci-check.mjs` 的 `ALL_PROJECTS` 按 `apps/<name>/{src,package.json,tsconfig.json,next.config.*}`
判定「这是一个 Next 应用」，然后套 `check-i18n-keys`（要求 `messages/en.json`）、`check-console`
（禁 `console.log`）等规则。

- ✅ `apps/portal/workers/email-cron/` —— 检测只看 `apps/portal` 这一层，`workers/` 子目录**不被当成项目**。
- ❌ `apps/<name>/`（曾这么放过采集 Worker）—— `apps/<name>/src` 命中判定 → 被当 Next 应用，
  `check-i18n-keys` 报找不到 `messages/en.json`，`check-console` 报 `console.log`，push 被 CI 拦下。
- ✅ `workers/media-gateway/` —— `apps/` 之外，分类正确。

**新 Worker 的位置选择**：跟某个 app 强耦合（只服务它）→ 放 `<app>/workers/<name>/`；
跨 app 或独立（如 media 服务于 site 转发 + 外部 CRM）→ 放顶层 `workers/<name>/`。

---

## 7. 新增 Worker 的检查清单

- [ ] 目录位置按 §6 选对（别放 `apps/<name>/`）
- [ ] `wrangler.toml`：`name` 用 `tc-web-*` 前缀、`compatibility_date` 写当天
- [ ] 需要的 secret 在同一目录 `README.md` 里列全，并注明「与哪个 Pages 项目同名同值」
- [ ] 有 D1 的一律带 `migrations/`，且 `migrations apply --remote` 后再 deploy
- [ ] 日志结构化、不含正文
- [ ] deploy 后真打一次（含失败路径）
- [ ] `NOTES.md` 记一条踩坑（尤其新遇到的平台行为）
