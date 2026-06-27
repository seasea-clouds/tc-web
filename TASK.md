# i18n 全面修复计划 — 完成状态

## ✅ 全部 P0/P1/P2 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| P0-1 博客 Navbar 覆盖键 | ✅ | 删除 48 文件覆盖键 |
| P0-2 定价 Intl.NumberFormat | ✅ | 代码重构 + 48 文件删键 |
| P0-3 计费页链接 404 | ✅ | 加 locale 前缀 |
| P0-4 My Reports 硬编码 | ✅ | runACheck + 链接修复 |
| P0-5 GACC 类别键 | ✅ | 补全所有语言 |
| P0-6 博客 CopyButton | ✅ | CSP + aria-label |
| P0-7 ReportShell/rules.ts | ✅ | 全模块 i18n 化完成 |
| P1-1 "View 计划s" | ✅ | |
| P1-2 "Sign Out" | ✅ | |
| P1-3 Settings 页面 | ✅ | |
| P1-4 定价页链接 | ✅ | |
| P1-5 Check 键完整性 | ✅ | 48 语言全部验证通过 |
| P2-1 面包屑 | ✅ | |
| P2-2/P2-3 翻译质量 | ✅ | |
| P2-4 CopyButton aria-label | ✅ | |
| P2-5 报告翻页 | ✅ | API + 前端 |

## ✅ CI 增强完成

| 检查 | 说明 |
|------|------|
| CI-1 check-hardcoded-templates.mjs | 检测 rules.ts 数据层英文模板 |
| CI-2 check-category-labels.mjs | 品类翻译键完整性校验 |
| CI-3 check-override-keys.mjs | 跨 App 消息覆盖检测 |
| CI-4 check-locale-prefix.mjs | 路由 locale 前缀检测 |

## 📦 翻译任务（待提交 translate-tool）

| 任务 | 键数 | 说明 |
|------|------|------|
| rules-dimension-notes-v2 | ~12 | 新加的风险维度/说明键，需翻译 |
| label-allergen-note | 1 | labelAllergenNote 键 |
| gacc-timeline-durations | ~10 | 数据层工期值（exempted，纯数据可不译） |

## ⏳ 剩余余

- **翻译提交：** 将新增的 ~12 键提交 translate-tool 完成 47 语言翻译
- **rules.ts 数据层纯数据值：** `"1-2 weeks"`、`"2-4 weeks"` 等工期值，CI 已豁免（纯数据不参与 i18n）
