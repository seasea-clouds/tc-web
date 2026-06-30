# TASK.md — 当前待执行任务

## ⚠️ 待恢复项（翻译完成后必须处理）

**🔴 任务 0：恢复 build:ci 模式**
- 翻译到位（硬编码英文回退数降为 0）后，将各 app 的 `build:ci` 脚本合并回 `build`，重新启用 `--ci` 标记
- 涉及文件：`apps/site/package.json`、`apps/portal/package.json`、`apps/blog/package.json`
- 背景：P3 翻译任务失败导致 738 处硬编码英文未翻译，临时移除 `--ci` 让 CF Pages 构建通过
- 触发条件：`portal-rules-i18n-p3` 重新提交完成，各项目硬编码数归零

## 🔴 高优先级

**任务 1：修复 `/zh/c/me/` 页面显示 raw key 值**
- 现象：页面显示 `myAccount`、`signOut` 等翻译 key 名原文
- 原因：页面使用 `useTranslations('Dashboard')` 但 `myAccount` 和 `signOut` 不在 `Dashboard` 命名空间
- 解决方案：改用 `useT('Report')('myAccount')` 和 `useT('Auth')('signOut')`
- 涉及文件：`apps/portal/src/app/[locale]/c/me/page.tsx`

**任务 2：修复面包屑 "reports" 未翻译**
- 现象：面包屑中 `reports` 路径段显示为英文或显示为 key 名
- 原因：`AutoBreadcrumb` 的 `SEGMENT_LABELS` 缺少 `'reports'` 映射
- 解决方案：
  1. `packages/ui/src/AutoBreadcrumb.tsx` 添加 `'reports': 'reports'`
  2. 48 语言 `Navbar` 命名空间添加 `"reports"` key
- 涉及文件：`packages/ui/src/AutoBreadcrumb.tsx` + 48 个 locale JSON

**任务 3：修复报告页英文残留**
- 现象：GACC/NMPA/CCC 等报告页面仍有少量英文硬编码（weeks、months、moderate、Compliance Risk: 等）
- 解决方案：检查 report 组件代码，将硬编码英文替换为 `t()` 调用
    添加对应翻译 key
- 涉及文件：portal report 组件

## 🟡 中优先级

**任务 4：排查订阅支付未显示问题（David 账户 $9.9）**
- 现象：David 已支付 $9.9，但 portal 仍显示免费计划
- 原因待确认：需查看 CF Pages Functions 日志，确认 Creem webhook 事件是否正常接收
- 涉及的 webhook 事件：`checkout.completed`、`subscription.active`

**任务 5：修复定价 / 套餐页 P3 遗留问题**
- 现象：用户下拉菜单 / Pricing 页面仍有部分硬编码英文
- P3 翻译任务 `portal-rules-i18n-p3` 已失败（仅完成 5/7097 条）
- 需要翻译工具恢复后重新提交 151 keys × 47 语言
- 当前 738 处硬编码英文回退待翻译

**任务 6：博客分享复制链接功能**
- 现象：复制链接按钮点击后无视觉反馈（缺少 checkmark 图标切换）
- 涉及文件：blog 分享组件

## 🔵 低优先级 / 待调研

**任务 7：Pricing 页面向导链接验证**
- 现象：`Start Free` 按钮链接到 `/{locale}/c/`（自查页面），需验证功能正确

**任务 8：Dashboard 账单页 404 问题**
- 现象：账单页链接到 `/{locale}/c/pricing/`，用户反馈 404
- 可能原因：Worker 代理路由问题或 SSG 缺失

**任务 9：中文标签措辞不一致**
- 现象：`chineseLabelArtworkReady` key 预期翻译为"您的产品中文标签设计稿准备好了吗？"
  但现场显示"中国标签艺术品准备好了吗？"
- 需确认是缓存问题还是代码中 key 引用错误

**任务 10：Pricing 价格格式**
- 现象：zh 语言下 `Intl.NumberFormat` 渲染为 "1.99 美元" 而非 "$1.99"
- 已确认此为 `Intl.NumberFormat` 的规范行为，是否变更待定
