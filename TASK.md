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

---

## ✅ 已完成（续）

### P1 — 部署上线
- [x] 正式域名 `sinotradecompliance.com` 切换（2026-06-09）
- [x] 归档旧仓库 `sinotradecompliance` 和 `compli-service`
- [x] Worker 代理全面验证

## 🟡 当前任务（P0）

### T1 — 修复 Free Check 跳中文
- [x] T1a. site layout 加 `freeCheckHref="/c/"` 
- [x] T1b. 清理 portal 旧的 `/` → `/compli-service/` redirect
- [x] T1c. 清理 `out/_redirects` 和 `public/_redirects` 旧 compli-service 规则

### T2 — 增强检查流水线
- [x] T2a. `check-hardcoded.mjs`: 扩大检测范围（placeholder、短文本≥5、Uppercase Word 包容正则、括号内英文）
- [x] T2b. `check-translations.mjs`: 各语言 JSON 中值为英文原文且不在 IGNORE_FALLBACK_VALUES 的 key 报 warning

### T3 — 修复 6 个 check-client.tsx 硬编码英文
- [x] T3a. 补齐 `zh.json` / `en.json` Check 命名空间的缺失 key
- [x] T3b. GACC check-client.tsx 全量替换硬编码 → `t()`
- [x] T3c. NMPA check-client.tsx 全量替换硬编码 → `t()`
- [x] T3d. CCC check-client.tsx 全量替换硬编码 → `t()`
- [x] T3e. Label check-client.tsx 全量替换硬编码 → `t()`
- [x] T3f. Crossborder check-client.tsx 全量替换硬编码 → `t()`
- [x] T3g. Trademark check-client.tsx 全量替换硬编码 → `t()`

### T4 — 修复提交表单不跳转
- [x] T4a. `handlePayment` 跳转改为 `useSubsiteHref()` 统一路径生成
- [x] T4b. 简化 API 依赖链：用 localStorage 后备

---

## ⬜ 远期

### P1 — 部署上线
- [x] CF Pages 环境变量验证（D1 + JWT + Creem + Resend）
- [x] 正式域名 `sinotradecompliance.com` 切换 ✅
- [x] 归档旧仓库 `sinotradecompliance` 和 `compli-service`
- [x] Worker 代理全面验证

### P2 — 支付 & 功能
- [ ] Creem 支付真实对接 + Webhook
- [ ] 报告 PDF 下载（D1 + R2）
- [ ] Email 报告发送流程完善

### P3 — 48 语言翻译填充
- [ ] Portal Check 命名空间 48 语言翻译
- [ ] Portal Home / Pricing / Auth 翻译补齐
- [ ] check-translations.mjs 全面跑通无报错
