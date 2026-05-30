# TASK.md — Compli-Service 详细任务清单

> 优先级：P0=阻塞项 / P1=核心功能 / P2=优化 / P3=远期
> 执行规则：从 P0 开始，同优先级可并行

---

## ✅ 已完成

- [x] T01. 项目初始化（Next.js + Tailwind + TypeScript + Pages）
- [x] T02. Core 层（支付/邮件/PDF/D1 Schema）
- [x] T03. 首页 6 服务入口卡片
- [x] T04. GACC 自查表单（3 步）
- [x] T05. GACC 判断逻辑（rules.ts + report.ts）
- [x] T06. Pages Functions 骨架（Webhook + 报告生成）
- [x] T07. 报告展示组件（ReportViewer + PDF 模板）
- [x] T08. 定价页（含 Professional Service 列）
- [x] T09. 构建验证
- [x] T10. GitHub 仓库 `seasea-clouds/compli-service`
- [x] T11. CF Pages 部署 `compli-service.pages.dev`
- [x] T12. 环境变量配置（密钥类型 secret_text）
- [x] T13. 48 语言 i18n（next-intl + LanguageSwitcher）
- [x] T14. 页头页脚与主站完全对齐
- [x] T15. 品牌 Header/Footer
- [x] T-MODULES. 6 个自查模块全部完成（rules.ts + report.ts + page.tsx）
- [x] T-I18N-LINK. Header/Footer 链接使用 `useClientLocale()` 动态语言
- [x] T-AUTH. 登录/注册系统（JWT + localStorage + Pages Functions）
- [x] T-WORKER. 主站 Pages Function 代理 `/compli-service/*` → 用户站
- [x] T-REPORT-CTA. 报告末尾 ExpertCTA 联系专家引导
- [x] T-REPORT-ROUTE. `/report/` 页面（query param ?id=xxx）展示付费报告
- [x] T-I18N-SYNC. 主站/用户站语言切换通过 localStorage 同步
- [x] T-FAVICON. 用户站网站图标（favicon.ico + icon.png）
- [x] T-BASEPATH. basePath: /compli-service 配置，静态资源路径一致
- [x] T-REPORT-REFACTOR. 报告系统改为模块感知架构
  - types.ts: 统一 BaseReportData + 模块扩展类型
  - ReportShell: 模块感知报告外壳（共享区块 + 专有区块）
  - sections/BaseSections: 决策/法规/时间线/费用/前瞻/术语
  - sections/ModuleSections: 各模块专属区块（Gacc/Ccc/Label/Nmpa/CB/TM）
  - 删除 5 个旧 preview_xxx/，统一预览页
  - 修复 gacc/page.tsx duplicate required
  - 修复 label/rules.ts CostItem 类型
  - 构建 0 错误通过

---

## ✅ 已完成

### T-REPORT-ALL-MODULES. ReportShell 全模块支持
- ReportShell 导入 6 模块全部 30 个专有区块（GACC/CCC/Label/NMPA/CB/TM）
- 模块感知映射：根据 `module` prop 条件渲染对应 5 个专有区块
- Group A（Channels 后 — 目录/标准方向）+ Group B（RiskMatrix 后 — 测试/流程方向）

### T-CHECK-FIELDS. 各模块 check 表单新增 5 字段
- **GACC:** manufacturerName, exportVolume, packagingMaterial, hasLabelArtwork, productDescription
- **CCC:** manufacturerCountry, hasCBReport, voltagePower, hasCEorUL, annualVolume
- **Label:** originCountry, hasNutritionData, allergenInfo, hasLabelArtwork, ingredientsDeclaration
- **NMPA:** hasAlcohol, hasSunscreenClaim, productFunction, packagingVolume, hasGMPCert
- **CB:** monthlyVolume, hasTMRegistration, hasChineseLabel, productWeight, shelfLifeMonths
- **TM:** hasChineseName, hasForeignRegistration, tmClassDescription, brandYearsInMarket, needsCustomsRecordal
- 对应输入接口均已添加可选字段

### T-BUILD-VERIFY. 构建验证 ✅
- ✅ 构建通过：18 pages, 0 error, 0 type error
- 所有 6 模块 check 路由正常：/check/{gacc|ccc|label|nmpa|crossborder|trademark}

## 🟠 P1 — 核心功能

### T-PAYMENT. Creem 支付真实接入
- **步骤：**
  - [ ] T-PAYMENT-1. Creem 测试环境验证 API key
  - [ ] T-PAYMENT-2. 更新 checkout Pages Function 使用真实 API
  - [ ] T-PAYMENT-3. Webhook 处理真实回调（含签名验证）
  - [ ] T-PAYMENT-4. 端到端测试支付流程
  - [ ] T-PAYMENT-5. 构建验证 + 部署

---

## 🟡 P2 — 优化

### T-MAIN-NAV. 主站 Navbar 新增 "Free Check" 按钮
- **状态：** ✅ 已完成（指向 `/compli-service/`）

### T-MAIN-CTA. 主站首页/服务页 CTA
- **步骤：**
  - [ ] T-MAIN-CTA-1. 首页 Hero 下方加 "Try compliance checker" 引导
  - [ ] T-MAIN-CTA-2. 各服务页底部加对应模块 CTA
  - [ ] T-MAIN-CTA-3. 构建验证 + 部署

### T-PRICING-LINK. 定价页 Professional Service 链接使用当前语言
- **状态：** ✅ 已完成

### T-GACC-UNIFY. GACC 页面改用共享 CheckForm 组件
- **步骤：**
  - [ ] 评估是否值得统一（GACC 含支付流程，与其他 5 模块不同）
  - [ ] 如需统一，改造 CheckForm 支持可选的支付回调

---

## 🟡 P2 — 远期

### T-LOCALE-ROUTE. Worker 路由支持 `/{locale}/compli-service/*`
- **状态：** ✅ 已完成（主站 middleware 处理 locale 前缀）
### T-TRANSLATE. 用户站各语言翻译填充
### T-COOKIE. CookieConsent 占位（当前已完整实现，分析工具接入时需跟进）

---

> **执行顺序：** P1 → P2
> **Git：** 每个任务至少一次独立 commit，便于回滚
> **部署：** 每个独立功能完成后 push → CF 自动部署
