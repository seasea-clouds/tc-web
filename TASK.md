# trade-web 任务清单

> 优先级：P0=阻塞项 / P1=核心功能 / P2=优化 / P3=翻译填充
> 状态：✅ 已完成 🟡 进行中 ⬜ 未开始

---

## ✅ 已完成

### P0 — 基础架构 & 三站纳管
- [x] web/ 目录创建，三站代码迁入 monorepo
- [x] Portal 路由从 `/compli-service/` 改为 `/c/`
- [x] Worker 代理规则从 `compli-service` 改为 `c/`
- [x] 共享 UI 组件抽取（Navbar/Footer/LanguageSwitcher/SearchProvider/CookieConsent/ActionDock）
- [x] 共享编译脚本（build-all / check-hardcoded / check-translations / search-index / sitemap 等）
- [x] 产品文档写入（PROJECT/NOTES/GOAL/SOP/TASK）

### P0 — 工具架构 & Auth Cookie
- [x] tools.ts 工具注册表 + ToolCard 组件
- [x] Portal 首页重写（工具广场 + 漏斗文案）
- [x] 6 个 check-client 表单校验提示（缺失字段标红 + 红色横幅）
- [x] 登录/注册页加 CF Turnstile
- [x] Auth httpOnly Cookie Session 完整实现
- [x] useSubsiteHref 链接尾随 ? 问题修复
- [x] 三站构建全部通过

### P1 — 报告系统
- [x] `POST /api/report/save` 写入 D1
- [x] 6 个自助模块 rules.ts + report.ts 完整
- [x] ReportShell 全模块支持（6 模块 30+ 专有区块）
- [x] 各模块 check 表单补充完整输入字段
- [x] 报告页面 `/c/report?id=xxx`（D1 API + localStorage 后备路径）
- [x] Dashboard/用户中心完整（/me/*）

### P1 — 部署上线
- [x] 正式域名 `sinotradecompliance.com` 切换（2026-06-09）
- [x] 归档旧仓库 `sinotradecompliance` 和 `compli-service`
- [x] Worker 代理全面验证

### P1 — 翻译修复 & CI 优化 (2026-06-14)
- [x] T5a. 博客面包屑：AutoBreadcrumb.tsx 用 document.title 获取翻译后文章标题
- [x] T5b. 博客复制按钮：CopyButton.tsx 改进 clipboard API + textarea fallback
- [x] T5c. 价格符号统一：zh.json 所有 美元→$，48语言文件新增 gaccCat_*_label 和 noReportId
- [x] T5d. GACC 结果页翻译：rules.ts 中 CATEGORY_LABELS→catLabel(t)，6个check-client传入locale
- [x] T5e. 按钮文字：完整报告 — $1.99 → 完整报告 $1.99（去破折号）
- [x] T5f. 报告页翻译：ReportViewer.tsx moduleLabels→MODULE_KEYS(t)，report/page.tsx 硬编码→t()
- [x] T5g. 报告页切换语言报错："No report ID provided"→t('noReportId')，LanguageSwitcher保留searchParams
- [x] T5h. Portal面包屑：layout.tsx加入AutoBreadcrumb共享组件
- [x] TypeScript编译：Portal ✅ Blog ✅ Site(readTime pre-existing)
- [x] 额外：me/reports/settings/subscription 硬编码→t()，LanguageSwitcher修复正则和query params保留

---

## 🟡 当前任务（进行中）

### T6 — 部署上线 (2026-06-14) ✅
- [x] 代码已提交并推送到 GitHub (commit b0470e9)
- [x] CF Pages 自动构建触发
- [ ] 等待部署完成后验证线上状态

### T7 — CI 脚本优化 (2026-06-14) ✅
- [x] check-hardcoded.mjs Check C：检测 rules.ts 数据文件中硬编码英文字符串
- [x] 数据文件硬编码（668条）不阻塞 CI，报告为"需要翻译"
- [x] 组件代码硬编码（659条）仍然阻塞 CI
- [ ] 待部署后验证 CI 通过

### T8 — 翻译任务提交 (2026-06-14) ✅
- [x] 翻译工具 SOP 读取完成
- [x] 翻译任务已提交: gacc-cat-labels-report-i18n
- [x] 19 个 key × 47 目标语言
- [x] 包含: gaccCat_*_label (16个) + noReportId + backToHome + notFoundDesc
- [x] zh 已完成手动翻译（15个 gaccCat_*_label + 3个新key）
- [ ] 等待翻译完成，取回结果后填入各语言文件
- [ ] 取回: translate-tool results -n gacc-cat-labels-report-i18n -o ./results.json

### T9 — 浏览器验证 (2026-06-14) ⬜
- [ ] 逐个验证8个问题的修复效果
- [ ] 多语言验证（zh/en/ja/ko/ru/es/fr/de）

### T10 — 举一反三排查 (2026-06-14) ⬜
- [ ] 全量扫描所有页面硬编码英文
- [ ] 全量扫描所有语言翻译缺失
- [ ] 全量扫描所有模块 locale 参数传递

---

## ⬜ 远期

### P2 — 支付 & 功能
- [ ] Creem 支付真实对接 + Webhook
- [ ] 报告 PDF 下载（D1 + R2）
- [ ] Email 报告发送流程完善

### P3 — 48 语言翻译填充
- [ ] Portal Check 命名空间 48 语言翻译
- [ ] Portal Home / Pricing / Auth 翻译补齐
- [ ] check-translations.mjs 全面跑通无报错
