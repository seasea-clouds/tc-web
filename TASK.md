# TASK.md — 全量 i18n 修复计划

## 总览

完整排查确认 **6 个模块 × 48 种语言** 存在不同程度的 i18n 问题。根本原因：
1. **代码 bug**（P0-1）：commit 5a2c5aa 引入了错误的 key 前缀
2. **数据缺失**（P1）：rules.ts 中的 `t()` key 有 ~341 个缺失、~140 个 namespace 错位
3. **CI 盲区**（P3）：无法检测缺失 key（已修复）
4. **无降级机制**（P4）：`buildT` 找不到 key 时直接返回 raw key（已修复）

---

## ✅ 已完成

| 编号 | 内容 | 状态 |
|------|------|------|
| P0-1 | free-result 类别前缀修复 (commit b99e670) | ✅ 已部署 |
| P0-2 | yesSpecialCosmetics 破折号修复 | ✅ 已部署 |
| P0-3 | CI + 构建 + 部署验证 | ✅ |
| P1a | 140 个 top-level key 复制到 Check namespace (commit 04d69a8) | ✅ 已部署 |
| P1b | 341 个完全缺失 key 写入 en.json | ✅ 已部署 |
| P3a | check-t-keys.mjs + CI 集成 | ✅ 未提交 |
| P3c | buildT 开发环境 console.warn | ✅ 未提交 |
| P4 | buildT en.json 降级（key 缺失时回退到英文） | ✅ 未提交 |

---

## 🔄 进行中

### P2 — translate-tool 翻译 47 语言
**任务：** portal-i18n-v4（348 keys → 47 种语言）
- 完成：732 / 16,356 项（4.5%）
- 速度：~80 项/小时，预计还需 ~8 天
- 0 错误
- 等待完成后合并到 47 个 locale 文件

---

## ⬜ 待执行

### T1 — 提交+部署 P3a/P3c/P4
- commit 4 个文件：check-t-keys.mjs, ci-check.mjs, i18n.ts, TASK.md
- 推送 → CF Pages 自动构建部署
- 验证 CI 通过、部署成功

### T2 — 更新文档
- NOTES.md 记录 P3/P4 技术决策
- SOP.md 更新 CI 检查清单

### T3 — 验证部署
- 浏览器检查 portal 页面
- 验证语言切换、报告页面

### T4 — Creem 支付验证
- 确认 webhook 正确接收付款
- D1 订阅状态正确（不重复记录）
- 单次报告购买流程
- 订阅连续性修复验证

### P3b — 动态 key 前缀验证（可选）
- 扩展 check-t-keys.mjs 检测 `t(\`prefix_${var}\`)` 模式
- 非紧急，可暂缓

---

## 当前状态

```
P0-1: ✅ P0-2: ✅ P0-3: ✅
P1a:  ✅ P1b:  ✅
P2:   🔄 (4.5%, ~8天)
P3a:  ✅ P3b: ⬜ P3c: ✅
P4:   ✅
T1:   ⬜ T2: ⬜ T3: ⬜ T4: ⬜
```
