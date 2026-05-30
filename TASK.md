# trade-web 任务清单

> 优先级：P0=阻塞项 / P1=核心功能 / P2=优化
> 状态：✅ 已完成 🟡 进行中 ⬜ 未开始

---

## ✅ 已完成

### P1 — Phase 1：基础架构
- [x] web/ 目录创建 + 代码拷贝
- [x] root package.json workspaces + turbo.json
- [x] Portal 路由迁入 `[locale]/c/`
- [x] 去掉 basePath，改为完整路径透传
- [x] Worker 代理规则 `compli-service` → `c/`
- [x] 共享 UI 组件抽取（Navbar/Footer/LanguageSwitcher）
- [x] Portal header/footer 改用 `@trade/ui`
- [x] 主站 ContactForm 金色风格改造
- [x] `--color-gold` 色值补充
- [x] 主站/Portal 构建验证（两边通过）

### P1 — Phase 2：报告持久化
- [x] `POST /api/report/save` 写入 D1
- [x] 6 个 check 表单：localStorage → D1 API
- [x] Report 页面：localStorage → D1 API
- [x] Worker 加 `/api/` 代理规则
- [x] API URLs 更新（compli-service → c/）

### P1 — Phase 3：Auth Cookie
- [x] Session 管理（`functions/lib/session.ts`）
- [x] Login API 返回 httpOnly Cookie
- [x] Register API 返回 httpOnly Cookie
- [x] Logout API 清除 session
- [x] `GET /api/auth/me` 验证 cookie
- [x] AuthProvider 改用 `credentials: 'include'`
- [x] Dashboard 移除 token 引用

### P2 — 用户中心
- [x] `/me/` 账户概览页面
- [x] `/me/reports` 报告列表页面
- [x] `/me/subscription` 订阅查看页面
- [x] `/me/settings` 账户设置占位
- [x] `GET /api/subscription` 接口

### P2 — 其他
- [x] admin/ 占位目录
- [x] 清理残留文件（useClientLocale 等）
- [x] GitHub repo 推送（seasea-clouds/trade-web）
- [x] 项目文档写入

### QF — 快速修复
- [x] 报告 truncate → break-words 修复
- [x] 市场份额数据补齐
- [x] Verdict 框加文字
- [x] executiveSummary 分段
- [x] 4 个模块 check 表单补充原产国字段
- [x] 后备路径 originCountry 修复

---

## 🟡 待执行

### P1 — 部署上线
- [ ] CF Pages: 主站重新连接 repo (Root: `apps/site`)
- [ ] CF Pages: Portal 重新连接 repo (Root: `apps/portal`)
- [ ] CF Pages: Portal D1 绑定配置
- [ ] CF Pages: Portal 环境变量（JWT_SECRET 等）
- [ ] 归档原仓库 `sinotradecompliance` 和 `compli-service`
- [ ] Worker 部署验证 `/en/c/` 代理正常

### P1 — 支付流程对接
- [ ] Creem 支付真实对接
- [ ] Webhook 处理付款回调 → 更新 D1
- [ ] Checkout API success_url 验证

### P2 — 功能完善
- [ ] 报告页 Redirect `/report/?id=` → `/report/[id]` 动态路由方案
- [ ] 密码修改功能
- [ ] 报告 PDF 下载（D1 + R2）
- [ ] Portal i18n 翻译填充（当前大量英文占位）

---

## ⬜ 远期

- [ ] Admin 管理后台开发
- [ ] Email 报告发送流程完善
- [ ] 多语言 48 → 精简语言数（SSG 产物优化）
- [ ] Portal 服务端 locale 路由消除客户端闪烁
