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
| P3a | check-t-keys.mjs + CI 集成 (commit fc40836) | ✅ 已部署 (ee5e0e10) |
| P3b | 动态 key 前缀验证：扩展 check-t-keys.mjs 检测 `t(\`prefix_${var}\`)` | ✅ 本会话完成 |
| P3c | buildT 开发环境 console.warn (commit fc40836) | ✅ 已部署 (ee5e0e10) |
| P4 | buildT en.json 降级（key 缺失时回退到英文）(commit fc40836) | ✅ 已部署 (ee5e0e10) |
| T1-T4 | 部署/文档/验证/Creem 支付 | ✅ 全部完成 |

---

## ✅ 全部完成

| 编号 | 内容 | 状态 |
|------|------|------|
| P0-1 | free-result 类别前缀修复 (commit b99e670) | ✅ 已部署 |
| P0-2 | yesSpecialCosmetics 破折号修复 | ✅ 已部署 |
| P0-3 | CI + 构建 + 部署验证 | ✅ |
| P1a | 140 个 top-level key 复制到 Check namespace (commit 04d69a8) | ✅ 已部署 |
| P1b | 341 个完全缺失 key 写入 en.json | ✅ 已部署 |
| P2 | portal-i18n-v4 翻译完成 — 16,356 key 已 merge | ✅ |
| P3a | check-t-keys.mjs + CI 集成 (commit fc40836) | ✅ 已部署 (ee5e0e10) |
| P3b | 动态 key 前缀验证 | ✅ |
| P3c | buildT 开发环境 console.warn (commit fc40836) | ✅ 已部署 (ee5e0e10) |
| P4 | buildT en.json 降级 | ✅ 已部署 (ee5e0e10) |
| P5.1-6 | 组件层硬编码英文 → t() | ✅ |
| P6 | 6 模块 NextSteps → t() | ✅ |
| P7 | 36 新 key × 47 语言翻译 (v5/v7 系列) | ✅ 已 merge |
| P8 | 翻译质量修复 — 5403 处 CamelCase 污染 (20 非拉丁语言) | ✅ |
| P9 | check-i18n-keys 硬编码英文修复 — 409 处 → 0 处 | ✅ |
| T1-T4 | 部署/文档/验证/Creem 支付 | ✅ |
| F1 | Footer 优化 | ✅ 已部署 |

## 构建状态

```
✅ 全量核验通过！48 种语言无质量问题
✅ 所有 i18n key 完整，无硬编码英文
✅ 0 缺失 + 0 多余 + 0 硬编码英文
✅ 全部检查通过 (build: 4/4 successful)
```

## 待执行

- 部署到生产环境（sinotradecompliance.com）
