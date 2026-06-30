# TASK.md — 当前待执行任务

## ⚠️ 待恢复项（翻译完成后必须处理）

**🔴 任务 0：恢复 build:ci 模式**
- 翻译到位后，将各 app 的 `build:ci` 脚本合并回 `build`，重新启用 `--ci` 标记
- 涉及文件：`apps/site/package.json`、`apps/portal/package.json`、`apps/blog/package.json`
- 现状：因 P3 翻译卡住（738 处硬编码英文回退），临时将 `build` 中的 `--ci` 移除到 `build:ci`
- 触发条件：所有翻译任务完成且 CI 每项目硬编码数降为 0

## 待修复问题（按优先级排序）

### 高优先级

**任务 1：修复 /zh/c/me/ 页面 Dashboard.myAccount / Dashboard.signOut 显示 raw key**
- 原因：页面使用 `useTranslations('Dashboard')`，但 `myAccount` 和 `signOut` 不在 `Dashboard` 命名空间
- 解决方案：改用 `useT('Report')('myAccount')` 和 `useT('Auth')('signOut')`
- 涉及文件：`apps/portal/src/app/[locale]/c/me/page.tsx`

**任务 2：修复面包屑 "reports" 未翻译**
- 原因：`AutoBreadcrumb` 的 `SEGMENT_LABELS` 缺少 `'reports'` 映射
- 解决方案：(1) `AutoBreadcrumb.tsx` 添加 `'reports': 'reports'` (2) 48 语言 `Navbar` 命名空间添加 `"reports"` key
- 涉及文件：`packages/ui/src/AutoBreadcrumb.tsx` + 48 个 locale JSON

### 中优先级

**任务 3：修复报告页英文残留**
- GACC/NMPA/其他报告页面仍有少量英文（weeks, months, moderate 等）
- 需要检查 report 组件代码并修复
- 涉及文件：portal report 组件

### 低优先级

**任务 4：排查订阅支付未显示问题（David 账户 $9.9）**
- 需要查看 CF Pages 日志，确认 webhook 事件是否接收

**任务 5：头像下拉 "My Reports" 翻译**
- 检查 AuthProvider/SearchProvider 中的下拉菜单组件

**任务 6：博客分享复制链接功能**
- 检查博客分享按钮的 JS 代码
