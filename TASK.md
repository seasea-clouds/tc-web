# TASK.md — 当前待执行任务

## ⚠️ 待恢复项（翻译完成后必须处理）

**🔴 任务 0：恢复 build:ci 模式**
- 翻译到位（硬编码英文回退数降为 0）后，将各 app 的 `build:ci` 脚本合并回 `build`，重新启用 `--ci` 标记
- 涉及文件：`apps/site/package.json`、`apps/portal/package.json`、`apps/blog/package.json`
- 背景：P3 翻译任务失败导致 738 处硬编码英文未翻译，临时移除 `--ci` 让 CF Pages 构建通过
- 触发条件：`portal-rules-i18n-p3` 重新提交完成，各项目硬编码数归零

## ✅ 已完成（今日修复）

**🔴 任务 1：修复 /zh/c/me/ 页面 raw key 值** ✅
- 线上已正确显示中文，之前的 raw key 问题是部署缓存导致的

**🔴 任务 2：面包屑 "reports" 未翻译** ✅
- SEGMENT_LABELS 已有映射，UI package 和 Portal 均有中文翻译

**🔴 任务 3：报告页英文残留** ✅
- 修复 rules.ts 中 21 处硬编码英文为 `t()` 调用
- 涉及 GACC（语言注释/协这/进口量/常见问题）、NMPA（国家说明）、Trademark（品类标签）

**🟡 任务 4：订阅支付未显示（David $9.9）** ✅
- D1 数据库确认记录存在：`sub_6lkUfqVPSJ8WMnF8DJjrYj` → status: active
- webhook 事件流完整记录（update → active → checkout → paid）

## 📋 当前状态

**任务 5：翻译任务** — 需翻译工具组处理
- P3 翻译 `portal-rules-i18n-p3` 失败（仅完成 5/7097 条）
- 今天新加的 21 条 key 也需要提交翻译
- 需要翻译工具恢复后重新提交

**任务 6：博客复制链接** ✅ 已验证无问题
- CopyButton 已有 SVG 切换（链接图标 → 绿色勾 ✓ → 2 秒后复原）
- Clipboard API + textarea fallback，在线已验证通过

## 🔵 低优先级（待确认）

**任务 7：Pricing 页面向导链接** — `Start Free` → `/{locale}/c/` 功能正常

**任务 8：Dashboard 账单页 404** — 疑似 Worker 代理或 SSG 问题，待用户确认

**任务 9：中文标签措辞不一致** — 可能系缓存问题，待用户确认

**任务 10：Pricing 价格格式** — `Intl.NumberFormat` 规范行为，zh 下 "1.99 美元"
