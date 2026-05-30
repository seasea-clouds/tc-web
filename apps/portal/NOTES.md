# NOTES.md — 技术决策与踩坑记录

## 子站 URL 架构（统一方案）

### 规则

所有子站必须遵循主站的 locale 规则，URL 格式统一为：

```
/{locale}/<subsite-name>/<path>
```

例如：
- `/en/compli-service/check/gacc/`
- `/zh/compli-service/check/gacc/`
- `/en/checklist/company/abc/`
- `/ja/tradeclient/...`

主站 middleware 只支持这一种 URL 模式，**不支持**裸路径 `/compli-service/...`。

### 主站 middleware 职责

```
请求 → middleware
  │
  ├─ /{locale}/compli-service/*    → 去除 /{locale}/compli-service 前缀
  │                                   → 转发到 compli-service.pages.dev/*
  │
  ├─ /{locale}/checklist/*         → 转发到 checklist.pages.dev/*     (未来)
  ├─ /{locale}/tradeclient/*       → 转发到 tradeclient.pages.dev/*   (未来)
  │
  └─ 其他路径                       → 正常主站路由
```

### 子站构建约定

| 配置 | 值 | 作用 |
|------|-----|------|
| `basePath` | `/<subsite-name>` | 静态资源路径前缀，proxy 据此定位 |
| `API_BASE` | `/<subsite-name>/api` | 所有 API fetch 调用使用此前缀 |
| 内部链接 | 使用 `useSubsiteHref()` hook 生成 `/{locale}/<name>/...` | 保证 locale 一致性 |

### 子站内部链接统一处理

`useSubsiteHref(path)` → 返回 `/{locale}/compli-service{path}`（或对应子站名）

- 所有指向用户站内部的 `<a>`、`<Link>` 都用这个 hook
- 指向主站的链接继续用 `/{locale}/...`（导航/页脚）
- API 调用用 `API_BASE` 常量（不带 locale）

## 架构决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 路径 | `/compli-service/` 子路径 | SEO 最优，继承主域权重 |
| 支付 | Creem（PaymentProvider 抽象） | Merchant of Record，松耦合可换 |
| 邮件 | Resend（EmailProvider 抽象） | 已测通，松耦合可换 |
| PDF | @react-pdf/renderer v4.5.1 | React 组件生成 PDF，风格一致 |
| 人机验证 | CF Turnstile | 免费、无感、CF 原生 |
| 认证 | JWT + localStorage | 轻量、零依赖第三方、静态导出兼容 |
| 部署 | Pages + Worker 路由 | 独立 CI/CD，互不影响 |
| 多语言 | next-intl + 主站 locale 列表 | 48 语言特色，与主站一致 |

## Cloudflare Pages 部署

- **项目名：** `compli-service`
- **生产域名：** `https://compli-service.pages.dev`
- **GitHub 关联：** `seasea-clouds/compli-service` → master 分支自动部署
- **构建命令：** `npm run build`
- **输出目录：** `out/`
- **工作流：** push → CF Pages 自动构建 → 1-2 分钟上线

## 环境变量管理

- **唯一来源：** `~/.openclaw/.env`
- **CF Pages：** Preview + Production 各自配置，敏感变量用 `secret_text` 类型
- **已配置（2026-05-24）：** CREEM_API_KEY, CREEM_WEBHOOK_SECRET, CREEM_PRODUCT_ID_SINGLE, CREEM_PRODUCT_ID_SUBSCRIBE, RESEND_API_KEY, EMAIL_FROM, NODE_VERSION=22

## 认证方案

- **存储：** localStorage（关闭浏览器不丢）
- **JWT 有效期：** 24h（普通登录）/ 30 天（Remember Me）
- **API 鉴权：** `Authorization: Bearer <token>` header
- **路由守卫：** AuthProvider + ProtectedRoute 客户端组件
- **独立登录：** 不与主站共享（主站无用户系统），未来可统一

### 为什么不选 cookie？
- 静态导出（output: 'export'）无法在服务端写 HttpOnly cookie
- localStorage 对自查工具够用（不含敏感金融数据）
- 未来升级：Pages Function 可用 `Set-Cookie` header 设 HttpOnly cookie

## Cookie 同意

**当前不需要。** 理由：
- JWT 存 localStorage，非 cookie
- 无第三方追踪/分析工具
- GDPR 严格必要豁免
- 未来接入分析工具时需加 `<CookieConsent />` 组件

## i18n 多语言

- **依赖：** `next-intl`
- **框架来源：** 直接从主站复制（routing.ts, messages.ts, request.ts）
- **当前状态：** 48 语言框架就绪，所有语言使用英文消息
- **LanguageSwitcher：** localStorage 存储语言偏好，刷新当前页生效
- **ClientLocaleProvider：** 客户端运行时读取 localStorage → 动态加载对应语言消息（messagesMap 全量导入）→ 传入 NextIntlClientProvider
- **跨站语言同步：** 主站 LanguageSwitcher 切换时也写入 localStorage key，用户站通过同一 localStorage 读取，两边保持一致

## 页头页脚

- **来源：** 直接从主站 Navbar.tsx / Footer.tsx 复制适配
- **导航结构（完全对齐主站）：** Services(下拉) | Industries(下拉) | About | Packages | FAQ | Insights | LanguageSwitcher
- **顶栏：** Logo | WhatsApp | Get a Quote
- **页脚 4 列：** Services × 6 | Quick Links × 5 | Contact（col-span-2）
- **跨站链接：** 内部功能保留本站路由，导航/品牌链接指向主站（target="_blank"）

## 进度记录

- **2026-05-23:** 项目初始化，Core 层（支付/邮件/PDF），GACC 模块，首页，定价页
- **2026-05-24:** GitHub + CF Pages 部署 + 环境变量 + 48 语言 i18n + 页头页脚对齐
- **2026-05-25:** 项目定位重新梳理（漏斗模型），定价体系更新，认证方案确定，文档融合优化
- **2026-05-25 (v2):** 
  - LanguageSwitcher 改为 localStorage + 刷新当前页（不再跳转主站）
  - Header/Footer 链接使用 `useClientLocale()` 动态读取 localStorage locale
  - 新增 `ClientLocaleProvider` 运行时加载对应语言消息
  - 新增 `basePath: /compli-service` 使静态资源路径统一
  - 主站 Pages Function 代理 `/compli-service/*` → 用户站
  - 主站 LanguageSwitcher 切换时同步写入 localStorage
  - 修复 favicon 缺失，新增 ExpertCTA，完善报告页面路由
