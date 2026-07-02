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

## ✅ P3 — Worker Proxy JSON 边缘案例修复（已完成）

## ✅ P4 — Portal 404 排查（已完成）

## ✅ P5 — Portal CTA 修复（已完成）

## ✅ P6 — i18n CI 优化（已完成）

## ✅ P7 — 翻译任务提交（已完成）

## ✅ P8 — 部署验证记录（已完成）

---

## Issue 1 ✅ — 价格显示统一（formatPrice）

**问题：** 价格显示不一致 — 部分使用 formatPrice (Intl.NumberFormat)，部分硬编码（$0 / $500+），不同 locale 显示不统一

**修复：**
- **Site PackageCards.tsx**: 3 个价格 key（basicPriceFrom/advancedPriceFrom/premiumPriceFrom）改用 `{price}` 模板插值 + `Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })`
- **Site 48 locale files**: hardcoded 价格（`$500`, `500 美元`, `500$`, `1 500$` 等各国格式）→ 替换为 `{price}` 占位符
- **Portal page.tsx**: freePrice/professionalPrice → `formatPrice(0)` / `formatPrice(500)+`
- **Portal pricing/page.tsx**: 同上

## Issue 2 ✅ — 订阅连续性（webhook 合并）

**问题：** 用户续订时 Creem 创建新 sub_xxx ID，webhook 在 D1 创建新记录，导致订阅周期重叠

**修复：** `handleSubscriptionCreated` 中，当 `provider_subscription_id` 未匹配时，先查该 user_id 是否有 active 订阅：
- 有 → 更新现有记录的 period（延长相同时长），更新 `provider_subscription_id`
- 无 → 正常创建新记录

## Issue 3 ✅ — 68 个 i18n 翻译警告已消除

**问题：** `Auth.agreeToPrivacyError` 在所有 47 个非英文 locale 中保留英文文本

**修复：**
- 通过 translate-tool 分两批提交翻译（v2: 31 语言, v3: 16 语言）
- 合并翻译结果到 47 个 locale 文件
- 修复意大利语 HTML 实体（`&#39;` → `'`）
- CI 验证：
  - check-translations: ✅ 全量核验通过，48 语言无质量问题
  - check-i18n-keys: ✅ 全部通过
  - check-hardcoded: ✅ No hardcoded English

## 部署

- commit `14b0d65` → CF Pages auto-build → deployment `d3a10a46` (Active)
- 已验证：pricing 页面格式正确、login 页面翻译生效、PackageCards 价格插值正常

---

## Issues — 用户报告的问题

### Issue A 🔴 — 报告页翻译 + 语言切换问题

**问题 1a:** 报告页 `useEffect` 依赖数组为 `[id]`，切换语言时不刷新报告内容
**问题 1b:** LanguageSwitcher SSR 中 `window.location.search` 未定义，语言切换链接丢失 query params

**修复方案：**
1a. 报告页 page.tsx useEffect 依赖数组改为 `[id, locale]`)
1b. LanguageSwitcher 改用 `useSearchParams()` 替代 `window.location.search`

**涉及文件：**
- `apps/portal/src/app/[locale]/c/report/page.tsx`（1 行变更）
- `packages/ui/src/LanguageSwitcher.tsx`（~5 行变更）

---

### Issue B 🔴 — 订阅状态显示 cancelled

**状态：2026-07-02 已修复部署** ✅

- **已修复：** webhook `handleSubscriptionCancelled` 中 `'cancelled'` → `'canceled'`（匹配前端 `STATUS_LABELS` key）
- **已修复：** 订阅 API query 改为优先返回 active 订阅（`ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END`）
- **已修复：** D1 脏数据 `cancelled` → `canceled`
- 无需再次操作

---

### Issue C 🟡 — Label 表单选项破折号

**问题 3a:** zh.json 中 3 个选项 key 使用 `——` 而非 `：`
- `noNeedTesting`: "否——需要实验室测试"
- `yesLabelArtwork`: "是的——带有完整的实验室报告"
- `noNeedOne`: "不——需要一个"

**问题 3b:** 其他 52 处 `——` 分布在 glossary/描述中（暂不动）

**修复方案：** 修改 3 个 key × 48 语言文件

**涉及文件：** `apps/portal/messages/*.json`（48 文件）

---

### Issue D 🔴 — 免费结果页"类别"字段未翻译

**问题 4a:** 5/6 模块 free-result 使用 hardcoded English 的 `CATEGORY_LABELS[...]`

| 模块 | 当前 | 修复方案 |
|------|------|---------|
| GACC ✅ | `t(`gaccCat_${...}_label`)` | 无需修改 |
| CCC ❌ | `CATEGORY_LABELS[...]` | 改为 `t(`catLabel_${...}`)` |
| NMPA ❌ | `CATEGORY_LABELS[...]` | 同上 |
| Cross-Border ❌ | `CATEGORY_LABELS[...]` | 同上 |
| Trademark ❌ | `CATEGORY_LABELS[...]` | 同上 |
| Label ❌ | `CATEGORY_LABELS[...]` | 同上 |

**问题 4c:** 其他模块同样检查，其他字段（产品名、risk level 等）已正常不需要改

**涉及文件：** 5 × check-client.tsx

---

## 部署清单

1. 报告页 locale 依赖 + LanguageSwitcher SSR
2. Label 3 个选项破折号（48 语言）
3. 5 个模块 free-result 类别翻译
4. 全部 CI 验证通过后推送
5. 验证线上状态
