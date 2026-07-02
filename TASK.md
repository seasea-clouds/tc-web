# TASK.md — 全量 i18n 修复计划

## 总览

完整排查确认 **6 个模块 × 48 种语言** 存在不同程度的 i18n 问题。根本原因：
1. **代码 bug**（P0-1）：commit 5a2c5aa 引入了错误的 key 前缀
2. **数据缺失**（P2-3）：rules.ts 中的 `t()` key 有 ~1042 个有效缺失
3. **namespace 错位**（P2）：部分 key 在 top-level 而非 Check namespace
4. **CI 盲区**（P4）：无法检测缺失 key
5. **无降级机制**（P5）：`buildT` 找不到 key 时直接返回 raw key

---

## P0-1 🔴 free-result 类别前缀修复

**问题：** commit 5a2c5aa 将 4 个模块的自由结果类别改为 `t(\`catLabel_\${v}\`)`，但只有 Label 模块使用 `catLabel_` 前缀，其他模块使用各自的特定前缀。结果显示为 raw key。

**需要修改 4 个文件：**

| 文件 | 当前 | 改为 |
|------|------|------|
| `ccc/check-client.tsx:305` | `catLabel_${...}` | `catCcc_${...}` |
| `nmpa/check-client.tsx:294` | `catLabel_${...}` | `catNmpa_${...}` |
| `crossborder/check-client.tsx:303` | `catLabel_${...}` | `catCb_${...}` |
| `trademark/check-client.tsx:304` | `catLabel_${...}` | `catTm_${...}` |

- [x] 完成（commit b99e670 → CF Pages 585daf10 Active）

---

## P0-2 🟡 yesSpecialCosmetics 破折号修复

**问题：** zh.json 中 `yesSpecialCosmetics = "是的——特殊化妆品"` 使用中文破折号 `——`，应使用冒号 `：`

**修改：** 1 个文件 1 个 key

| 文件 | 当前 | 改为 |
|------|------|------|
| `apps/portal/messages/zh.json` | `"是的——特殊化妆品"` | `"是的：特殊化妆品"` |

- [x] 完成

---

## P0-3 🟡 验证 CI + 构建 + 部署

- [ ] 运行 CI 检查（check-translations / check-i18n-keys / check-hardcoded）
- [ ] 构建 portal + site + blog
- [ ] commit & push
- [ ] 确认 CF Pages 部署成功

---

## P1 🔴 补全 en.json Check namespace（~1042 key）

**背景：** 6 个模块的 rules.ts 使用 `buildT(locale)` 调用 `t("key")`，但 `buildT` 只查找 `locale.json.Check` namespace。大量 key 要么完全不存在，要么在 top-level。

### 1a — 将 top-level key 移入 Check namespace

以下 key 存在于 en.json 的 top-level 但 buildT() 的 Check namespace 找不到：

| 模块 | Top-level key 数量 | 示例 |
|------|-------------------|------|
| CCC | ~26 | `cccRequiredDoc_0~6`, `cccProfile_*_riskReason`, `cccDetailedTimeline`, `cccLabGuide` |
| GACC | ~21 | `gaccProfile_*_riskReason`, `gaccStandards` 等 |
| Label | ~40 | `labelAllergen_*`, `labelReqDoc_chineseDesign`, `labelReqDoc_cfs` 等 |
| NMPA | ~7 | 少量 |
| Crossborder | ~2 | |
| Trademark | ~14 | `tmCompetitiveAnalysis` 等 |

**方案：** 用 Python 脚本复制所有 top-level 模块前缀 key 到 `Check` 子对象中，不动原有的 top-level 引用（其他代码可能依赖）。

### 1b — 为完全缺失的 key 编写英文文本

以下 key 在 en.json 完全不存在（任何层级都没有）：

| 模块 | 完全缺失 | 示例 |
|------|---------|------|
| NMPA | ~132 | `nmpaProfile_*_riskReason`, `nmpaTimeline_*`, `nmpaMarket_*`, `nmpaHorizon_*`, `nmpaCost_*` 等 |
| CCC | ~117 | `cccChannel_*`, `cccCost_*`, `cccCompetitiveAnalysis` 等 |
| GACC | ~281 | `gaccProfile_*_riskReason`, `common_issue_*`, `fta_*` 等 |
| Label | ~140 | `labelAllergen_*`, `labelChannel_*`, `labelCost_design_*`, `labelCompetitiveAnalysis` 等 |
| Crossborder | ~144 | `cbChannel_*`, `cbCost_*`, `cbCustomsDoc_*` 等 |
| Trademark | ~118 | `tmChannel_*`, `tmCost_*`, `tmCompetitiveAnalysis` 等 |

**方案：** 为每个模块创建一个 Python 脚本：
1. 解析 rules.ts 提取所有 `t("key")` 调用
2. 对比 en.json 筛出缺失
3. 对短 key（CATEGORY_LABELS 类型），用 `snake_case → Title Case` 转换
4. 对专业 key（riskReason 等），手动补充短英文文本
5. 结果写入 en.json Check namespace

**优先级：** 先做影响最大的 NMPA + CCC（用户正在测试的模块），再做其他 4 个。

- [ ] 1a: 复制 top-level key 到 Check namespace
- [ ] 1b: 编写 NMPA 缺失 key
- [ ] 1c: 编写 CCC 缺失 key
- [ ] 1d: 编写其他 4 模块缺失 key

---

## P2 🟡 translate-tool 翻译 47 语言

- [ ] 将 P1 补全后的 en.json 作为源，提交翻译
- [ ] 合并翻译结果到 47 个 locale 文件
- [ ] CI 验证

---

## P3 🟡 CI 改进

### 3a — check-t-keys.mjs（新增脚本）
扫描所有 `.ts`/`.tsx` 中的 `t("static_key")` 调用，验证 key 在 en.json 对应 namespace 中存在。

**检测覆盖：**
- `t("cccProfile_electronics_riskReason")` → 查 `en.json.Check.cccProfile_electronics_riskReason`
- `t("cccRequiredDoc_0")` → 查 `en.json.Check.cccRequiredDoc_0`

**不检测：**
- 动态 key `t(\`catLabel_${v}\`)` — 需要独立的前缀验证

### 3b — 动态 key 前缀验证
扫描 `t(\`prefix_${var}\`)` 模式，提取 prefix，与 locale 文件中的 key 前缀交叉验证。

### 3c — buildT 开发环境警告
在 `buildT` 中，当 key 缺失时输出 `console.warn("[i18n] Missing key: …")`

- [ ] 3a: check-t-keys.mjs
- [ ] 3b: 动态前缀验证（可选）
- [ ] 3c: buildT 警告

---

## P4 🟢 buildT en.json 降级

**问题：** `buildT` 在 key 不存在时直接返回 raw key。改进使其降级到 en.json 的值。

**修改 `packages/ui/src/TranslationProvider.tsx` 的 `useT`：**
当前：`return (typeof value === 'string' ? value : fallback) ?? key;`
改为：如果是生产环境且 value 不存在，查找硬编码的 en 数据作为最后 fallback。

- [ ] 完成

---

## 部署清单

- [ ] P0-1+P0-2: 提交修复代码
- [ ] P0-3: 验证 CI + 部署
- [ ] P1: 分模块补 key + 翻译 47 语言
- [ ] P3: CI 改进
- [ ] P4: buildT 降级

---

## 当前状态

```
P0-1: ✅ P0-2: ✅ P0-3: ⬜
P1a: ⬜ P1b: ⬜ P1c: ⬜ P1d: ⬜
P2:  ⬜
P3a: ⬜ P3b: ⬜ P3c: ⬜
P4:  ⬜
```
