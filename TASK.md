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

## 🔄 进行中

### P2 — translate-tool 翻译 47 语言
**任务：** portal-i18n-v4（348 keys → 47 种语言）
- 完成：9,177 / 16,356 项（**56.1%**）
- 已运行约 6 小时，速度 ~1,400 项/小时
- 0 错误
- 等待完成后合并到 47 个 locale 文件

### F1 — Footer 优化：Email 改标签 + 新增 Free Check 列
**状态：** 进行中
- [ ] Footer.tsx — 邮箱改标签 + 插入 Free Check 列
- [ ] en.json — 新增 7 个 Footer key
- [ ] translate-tool — 提交 47 语言翻译
- [ ] 合并翻译 → commit → 部署

---

## ⬜ 待执行

- P2 翻译完成后的 merge + 部署
- F1 翻译完成后的 merge + 部署

---

## 当前状态

```
P0-1: ✅ P0-2: ✅ P0-3: ✅
P1a:  ✅ P1b:  ✅
P2:   🔄 (56.1%, 预计今晚)
P3a:  ✅ P3b: ✅ P3c: ✅
P4:   ✅
T1-T4: ✅
F1:   🔄
```
