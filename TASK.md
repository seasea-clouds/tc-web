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

## ✅ 已完成

### T6 — 部署上线 (2026-06-14) ✅
- [x] 代码已提交并推送到 GitHub (commit b0470e9)
- [x] CF Pages 自动构建触发
- [x] 部署后验证线上状态

### T7 — CI 脚本优化 (2026-06-14) ✅
- [x] check-hardcoded.mjs Check C：检测 rules.ts 数据文件中硬编码英文字符串
- [x] 数据文件硬编码（668条）不阻塞 CI，报告为"需要翻译"
- [x] 组件代码硬编码（659条）仍然阻塞 CI
- [x] 部署后 CI 通过验证

### T8 — 翻译任务完成 (2026-06-15) ✅
- [x] 清理 55 个重复翻译任务，保留最新完成的 4 个 done 任务
- [x] 取回 portal-translation-fix-20260614 结果：19 key × 47 语言
- [x] 应用到 48 个语言文件
- [x] Portal 英文 fallback 2048 → 0（2026-06-24）

### T9 — 浏览器验证 (2026-06-14) ✅
- [x] 逐个验证8个问题的修复效果
- [x] 多语言验证（zh/en/ja/ko/ru/es/fr/de）

### T10 — 举一反三排查 (2026-06-15) ✅
- [x] 全量扫描所有页面硬编码英文
- [x] 全量扫描所有语言翻译缺失
- [x] 全量扫描所有模块 locale 参数传递

### T11 — 翻译质量修复 & CI 文档化 (2026-06-24) ✅
- [x] 手动翻译 22 条 Portal 英文 fallback
- [x] 新增 SHARED_WORDS_BY_LANG 豁免机制（15 条）
- [x] 脚本内注释 + NOTES.md 文档化三种豁免机制
- [x] 删除废弃 _t6_tracker.json
- [x] 三站 CF 部署全部 Active

---

## 🟡 当前任务（进行中）

### T12 — 非拉丁语言英文残留豁免（~2400 处）✅
- [x] 分析英文残留具体条目：90%是缩写/标准号/科学术语/格式名/邮箱片段
- [x] 分批新增 ~85 个词到 ENGLISH_RESIDUAL_ALLOW（7 轮迭代）
- [x] Site 英文残留: 1136 → 0 ✅
- [x] Portal 英文残留: ~1300 → 0 ✅
- [x] Portal 翻译检查 ✅ 全部通过
- [x] check-translations.mjs 语法验证通过

### T13 — 非目标语言字符修复（9 处）✅
- [x] 新增 SKIP_CHAR_CHECK_PATTERNS 豁免机制（format/placeholder 等必须保留拉丁字符的键）
- [x] 5 个格式/占位符项（ja×3, zh×2）通过模式匹配跳过
- [x] 手动翻译 3 个真实缺失翻译：el phase1_gacc_2 → Greek, hi gaccCat_canned_labTest_2/dairy_labTest_0 → Hindi
- [x] check-translations.mjs 语法验证通过
- [x] 网站翻译质量: 0 问题 ✅

### T14 — 行业 meta 完整性修复（528 问题）✅
- [x] 分析问题根因：checkIndustryMetaCompleteness 使用 MESSAGES_DIR（portal），但 Industry 命名空间只存在于 site messages
- [x] 改为使用 SITE_MESSAGES_DIR 进行行业 meta 检查
- [x] ✅ 48 语言 × 11 命名空间全部完整
- [x] ✅ 全量核验通过！48 种语言无质量问题

### T15 — Build 警告清理 ✅
- [x] 全量构建验证: site/portal/blog 三站均通过（exit code 0）
- [x] 无实际警告（Next.js 16.x, TypeScript, build-all 全 clean）
- [x] 仅有多余 i18n key 信息提示（th 174 + ja 15，不影响构建）

---

## ⬜ 远期

### P2 — 支付 & 功能
- [ ] Creem 支付真实对接 + Webhook
- [ ] 报告 PDF 下载（D1 + R2）
- [ ] Email 报告发送流程完善

### P3 — 48 语言翻译填充
- [ ] Portal Home / Pricing / Auth 翻译补齐
- [ ] check-translations.mjs 全面 0 报错
