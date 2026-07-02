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

## ✅ P2 — Portal UI label 修复（已完成）

**已完成：**
1. 新增 `Auth.agreeToPrivacyError` key 到 48 个语言文件
2. 修复 login/register 页面硬编码 ternary → 改用 `t('agreeToPrivacyError')`
3. 添加 15 个 GACC 品类标签 + 1 个 Trademark 品类到 `LEGIT_ENGLISH`
4. 添加 `Auth.agreeToPrivacyError` 到 `check-i18n-keys.mjs` 的 IGNORE_FALLBACK_KEYS
5. 运行 CI 验证：check-translations ✅ / check-i18n-keys ✅ / check-hardcoded ✅

## ✅ P3 — Worker Proxy JSON 边缘案例修复（已完成）

**诊断结果：**
- 主站 Worker 的 `/api/` 路由正常工作（所有 API 端点返回 JSON 而非 HTML）
- Portal 前端所有 API 调用使用相对路径 `fetch('/api/...')`，经 Worker `/api/` 路由正确代理
- 唯一问题：`/en/c/api/...` 路径经由 `/c/` 路由代理到 portal 时保留了 locale 前缀，导致 portal 返回 404 HTML

**修复：**
- 在 `proxyToPortal()` 中检测 `/c/api/` 模式，自动剥离 locale 前缀，正确映射到 portal 的 `/api/` 端点
