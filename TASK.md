# TASK.md — Trade Web

## 🔴 P0 — Creem 支付修复

**根因确认：** Creem test API 返回 **401 Invalid API Key**，两个本地存储的 API key 都已无效。

### 已完成的修复

| # | 状态 | 任务 | 说明 |
|---|------|------|------|
| S1 | ✅ 完成 | 同步 portal .env | `CREEM_API_KEY` 已统一为 master key |
| S2 | ✅ 完成 | 添加 debug-creem 端点 | `trade-web-portal.pages.dev/api/debug-creem` 可用 |
| S3 | ✅ 完成 | 更新 CF Pages secrets | `trade-web-portal` + `compli-service` 均更新 |
| S4 | ✅ 完成 | 触发 CF Pages 部署 | Git push → GitHub auto-build |
| S5 | ✅ 完成 | 验证 debug-creem | 端点工作，返回 Creem 401 Invalid API Key |

### ⚠️ 重要发现

**1. 两个 Creem API key 都无效**
- Master key (`creem_test_7VkMeyR8z46jiGObBfffTE`) → 401
- Portal key (`creem_test_4Xkla1XafsXmqUQ3x1fsrk`) → 401
- 需要：在 Creem Dashboard 生成新的 test API key

**2. ✅ 已删除废弃 CF Pages 项目**
- `sinotradecompliance` — 已删除
- `compli-service` — 已删除
- 主站 Worker `/c/` 路由必须改为指向 `trade-web-portal.pages.dev`

### 待完成子任务

- [x] S6: 在 Creem Dashboard 生成新的 test API key
- [x] S7: 更新 `~/.openclaw/.env` + `apps/portal/.env` 的 CREEM_API_KEY
- [x] S8: 更新 CF Pages secrets（仅 `trade-web-portal`）
- [x] S9: 验证 debug-creem 端点在线上可用（✅ 200 OK 新 Key）
- [ ] S9b: 验证完整 checkout 支付流程（需人工测试）

---

## 🟡 P1 — Portal pages.dev 404 问题

- `compli-service` 已删除，路由改为 `trade-web-portal.pages.dev`
- 先处理 Worker 路由更新

## 🟡 P2 — 16 个 Portal UI label 翻译合并

Portal 新增了 16 个 UI label，需要：
- 合并到 47 个 locale JSON 文件中
- 更新 `check-translations.mjs` 和 `check-i18n-keys.mjs` 的 IGNORE 列表
- 运行 CI 验证

## 🟡 P3 — Worker Proxy JSON 篡改

主站 Worker 代理 `/api/*` 到 Portal 时可能篡改 JSON 响应，浏览器端收到 HTML 而非 JSON。
