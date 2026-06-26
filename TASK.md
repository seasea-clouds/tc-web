# i18n 全面修复计划

## 🔴 P0 — 功能性 Bug / 硬编码英文

### P0-1 ✅ 博客导航/面包屑 "Blog" 未翻译
**问题：** `apps/blog/messages/*.json` 中 Navbar.blog / breadcrumb.blog 写死英文 "Blog"，覆盖 UI 包已有翻译
**修复：** 删除 48 文件中的 `Navbar.blog`/`Navbar.home`/`breadcrumb` 键
**文件：** apps/blog/messages/*.json (48 files)

### P0-2 ✅ 定价格式用 Intl.NumberFormat 重构
**问题：** 48 语言中 singlePrice / monthlyPrice 格式混乱（不同小数点、货币符号位置、货币名称），$9.9 应为 $9.90
**修复：** 从 48 文件中删除 singlePrice/monthlyPrice，改用 Intl.NumberFormat(locale, {style:'currency', currency:'USD', minimumFractionDigits:2}) 在组件中格式化
**文件：** apps/portal/messages/*.json (48 files, 移除2键), apps/portal/src/app/[locale]/c/pricing/page.tsx, apps/portal/src/app/[locale]/c/page.tsx

### P0-3 ✅ 计费页 "查看定价" 404
**问题：** dashboard/billing/page.tsx:47 — href="/pricing" 缺少 locale 前缀
**修复：** 改为 `/{locale}/c/pricing/`
**文件：** apps/portal/src/app/[locale]/c/dashboard/billing/page.tsx

### P0-4 ✅ My Reports "Run a Check" / 链接 / 多余点号
**问题：** me/reports/page.tsx:40 — "Run a Check" 硬编码; href="../check/gacc" 应改为 "../c/"; 多余 `.` 在 t('noReports') 后
**修复：** 替换为 t('runACheck') + 链接修复 + 去掉多余点号
**文件：** apps/portal/src/app/[locale]/c/me/reports/page.tsx

### P0-5 GACC 类别翻译键缺失
**问题：** gaccCat_coffee_tea_label / gaccCat_health_food_label 在 48 语言全缺失
**修复：** 补全 2 键到 en.json + zh.json，提交翻译任务
**文件：** apps/portal/messages/en.json, apps/portal/messages/zh.json

### P0-6 ✅ 博客复制链接按钮不工作
**问题：** CopyButton.tsx clipboard API 可能被 CSP 限制 / aria-label 硬编码
**修复：** 调试 CSP + 加反馈 Toast + aria-label 改为 i18n
**文件：** apps/blog/src/components/CopyButton.tsx

### P0-7 ✅ 报告页面大面积英文（ReportShell.tsx 全部替换，rules.ts 待更深重构）
**问题：** ReportShell.tsx ~15 处硬编码（CONFIDENTIAL, Prepared for:, Risk Score 等）；rules.ts 3 处风险维度 note 写死英文（compliance pathway, tests required, Estimated:）
**修复：** 替换为 i18n 键 + 改为使用 locale 格式化日期
**文件：** apps/portal/src/core/report/ReportShell.tsx, apps/portal/modules/gacc/rules.ts

---

## 🟡 P1 — 翻译质量 / 硬编码

### P1-1 ✅ Subscriptions "View 计划s"
**问题：** me/subscription/page.tsx:40 — View {t('plan')}s
**修复：** 改为 t('viewPlans')
**文件：** apps/portal/src/app/[locale]/c/me/subscription/page.tsx

### P1-2 ✅ My Account "Sign Out"
**问题：** me/page.tsx:71 — 写死 "Sign Out"
**修复：** 改为 t('signOut')
**文件：** apps/portal/src/app/[locale]/c/me/page.tsx

### P1-3 ✅ Settings 页面
**问题：** Name:/Email: 硬编码 + "轮廓" 翻译错误 + border-t 去掉
**修复：** 改为 i18n 键 + 补充翻译 + 去掉分隔线区块
**文件：** apps/portal/src/app/[locale]/c/me/settings/page.tsx

### P1-4 ✅ 定价页 "免费开始" 链接
**问题：** href={subsiteHref('/check/gacc')} 跳过模块选择
**修复：** 改为 /{locale}/c/
**文件：** apps/portal/src/app/[locale]/c/pricing/page.tsx

### P1-5 "Check.xxx" 交叉模块翻译键
**问题：** Check 命名空间中 reportModuleGacc 等键在 zh.json 存在，但 47 语言其他语言需确认
**检查：** 比对 ALL 48 语言是否存在 reportModuleGacc/ccc/crossborder/label/nmpa/trademark 键

---

## 🟢 P2 — 次要 / 翻译任务

### P-DEFERRED rules.ts 风险维度 note 英文（需要深层重构：传入 locale-aware 翻译器）
**影响：** gacc/ccc/nmpa/label/crossborder/trademark 各模块 rules.ts 中 ~4 处 note 模板字符串

### P2-1 ✅ 仪表盘面包屑
**问题：** AutoBreadcrumb SEGMENT_LABELS 中 dashboard/reports/billing/pricing/login/register/report 7 个键在 Navbar 消息中不存在
**修复：** 向 48 语言 UI 包添加 7 个 Navbar 键

### P2-2 ✅ "标签艺术品" 翻译质量
**问题：** chineseLabelArtworkReady 翻译别扭
**修复：** 改为 "标签设计稿"

### P2-3 ✅ crossborderTitle "支票→检查"
**问题：** zh.json: "跨境电商支票" — "支票" 应为 "检查"
**修复：** 改翻译

### P2-4 ✅ CopyButton aria-label
**问题：** aria-label="Copy link" 硬编码
**修复：** 改为 i18n 键

### P2-5 ✅ 报告列表翻页
**问题：** 无分页，一次性加载所有
**修复：** 增加分页组件（20条/页）+ 后端 API 支持 limit/offset
**文件：** functions/api/reports/list.ts (API), me/reports/page.tsx, dashboard/reports/page.tsx (UI)

---

## 🔧 CI 优化（后续）

### CI-1 代码级英文模板检测
**问题：** check-translations.mjs 只检查消息文件，不检查 rules.ts/ReportShell.tsx 中的模板字符串
**修复：** 增加对 "compliance pathway" / "tests required" / "Estimated:" 等模式的检测

### CI-2 gaccCat_*_label 完整性校验
**问题：** CATEGORY_LABELS 与消息键不同步
**修复：** 增加 rules.ts 与消息文件的交叉校验

### CI-3 跨 app 消息覆盖检测
**问题：** app 级消息覆盖了 UI 包已翻译键
**修复：** 检测 app locale 文件中的键是否在 UI 包中有翻译值但被英文覆盖

### CI-4 路由 locale 前缀检测
**问题：** 检测 href="/..." 无 locale 前缀的链接
**修复：** 正则匹配路由链接

---

## 📦 翻译任务（需提交给 translate-tool）

| 任务 ID | 描述 | 键数 | 语言 |
|---------|------|------|------|
| pricing-format-v1 | 移除 singlePrice/monthlyPrice，改为 Intl.NumberFormat | 0 (代码重构) | - |
| portal-harcoded-v6 | 补充 runACheck, viewPlans, signOut, nameLabel, emailLabel 等 | ~10 | 47 |
| portal-gacc-cats-v1 | 补充 gaccCat_coffee_tea_label, gaccCat_health_food_label | 2 | 47 |
| portal-report-labels-v1 | 报告页面新增 ~20 键（riskScore, verdict, timeline, confidential 等） | ~20 | 47 |
| portal-trans-quality-v5 | 修复 crossborderTitle, profile, noReports, chineseLabelArtworkReady | ~4 | 47 |

---

## 执行顺序

```
[迭代1] 代码修复 + 构建部署
    ├── ✅ P0-1 博客消息删除覆盖键 (48文件脚本批量)
  ├── ✅ P0-2 定价格式 Intl.NumberFormat 重构 (2组件 + 48文件删键)
  ├── ✅ P0-3 计费页链接 404 修复 (1文件)
  ├── ✅ P0-4 My Reports 修复 (1文件)
  ├── ✅ P0-6 博客 CopyButton + aria-label (1文件)
  ├── ✅ P1-1 Subscription "计划s" 修复 (1文件)
  ├── ✅ P1-2 My Account "Sign Out" (1文件)
  ├── ✅ P1-3 Settings 页面 (1文件)
  ├── ✅ P1-4 定价页链接修复 (1文件)
  ├── ✅ P2-2/P2-3 翻译质量小修
  ├── ✅ P2-4 CopyButton aria-label
  └── ⏳ P0-5 GACC类别key补全47语言翻译任务
  └── ✅ P0-7 ReportShell 15处硬编码 + preview i18n (7文件)
  ├── ✅ 翻译 9个 Check 新键 × 46语言
  └── ⏳ rules.ts 风险维度 note — 深层重构

[迭代2] ✅ 报告页修复
  ├── ✅ P0-7 ReportShell.tsx 15处硬编码 (7文件)
  ├── ✅ P0-7 preview/react-viewer i18n
  └── ⏳ rules.ts 3处模板英文 (需深层重构)
  ├── ✅ P2-1 AutoBreadcrumb 映射 (48 UI文件)
  └── ✅ P2-5 报告列表翻页 (3文件: API + 两个前端页面)

[迭代3] 翻译任务 + 合并 + 部署
  └── 提交对译任务 → 合并 → 构建 → 部署

[迭代4] CI 增强（后续独立迭代）
  └── CI-1~CI-4 新增检查规则
```
