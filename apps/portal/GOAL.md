# GOAL.md — Compli-Service 合规自查工具

## 项目定位

**Compli-Service 是 SinoTrade Compliance 主站的获客-教育-转化漏斗第一步，不是一个独立产品。**

```
用户旅程：
  免费自查 ($0)  →  付费报告 ($1)  →  联系专家 ($500+)
  ─────────────     ───────────      ────────────────
  获客入口           教育转化          商业转化（主站套餐）
```

## 核心规则

| 规则 | 说明 |
|------|------|
| ✅ 品牌一致 | 页头页脚与主站 Napbar/Footer 完全一致 |
| ✅ 48 语言 | 48 语言框架（next-intl）+ LanguageSwitcher，逐步填充翻译 |
| ✅ 漏斗定位 | 不自称独立产品，每份报告引导"联系专家"→ 主站 /quote/ |
| ✅ 松耦合 | 支付/邮件模块接口化，未来可换服务商 |
| ✅ 子路径 | `/compli-service/` 子路径部署，Worker 路由 |
| ✅ 独立登录 | JWT + localStorage，未来可与主站统一 |

## 定价体系

| 档位 | 价格 | 受众 | 说明 |
|------|------|------|------|
| 免费自查 | $0 | 所有访客 | 基础判断结果，SEO 流量入口 |
| 单次报告 | $1 | 想深度了解的出口商 | 完整报告+PDF+邮件，不登录 |
| 月订阅 | $9.9/月 | B 端高频用户（贸易代理/咨询公司/律所） | 无限次使用，需登录 |
| 专业服务 | $500+ | 需要正式进入中国市场的品牌 | 引导到主站 sinotradecompliance.com/packages/ |

> **说明：** $1 报告卖的是"认知"（帮用户搞清楚自己需要什么），不是专业服务。$9.9 订阅受众是高频 B 端用户，不是一年查一两次的普通出口商。

## 六大服务模块

| 模块 | 输入 | 输出 |
|------|------|------|
| **GACC 食品注册** | 品类、来源国、产品描述 | 是否需要注册 + 材料清单 |
| **中文标签合规** | 品类、规格 | 标签要求清单 |
| **CCC 认证** | 产品类型、HS编码 | 是否需要 CCC + 路径 |
| **化妆品备案** | 品类、成分 | NMPA 备案分类 + 清单 |
| **跨境电商** | 品类、平台 | 合规要求 + 所需材料 |
| **品牌保护** | 商标、品类 | 保护策略 + 注册建议 |

## 页面路由

```
/compli-service/                            首页 — 6 服务入口
/compli-service/check/[module]/             自查表单
/compli-service/report/[id]/                报告页
/compli-service/pricing/                    定价页（含专业服务引导）
/compli-service/auth/login                  登录
/compli-service/auth/register               注册
/compli-service/dashboard/                  用户后台（需登录）
/compli-service/dashboard/reports/          历史报告（需登录）
/compli-service/dashboard/billing/          订阅管理（需登录）
```

## 技术架构

### 构建与部署
- **框架：** Next.js（`output: 'export'`）+ next-intl + TypeScript + Tailwind CSS
- **部署：** Cloudflare Pages，GitHub push 自动构建
- **API：** Pages Functions（无状态，JWT 鉴权）
- **数据库：** Cloudflare D1（SQLite）

### 认证方案（JWT + localStorage）
```
登录:  POST /api/auth/login → 返回 JWT → 存入 localStorage
验证:  API 请求带 Authorization: Bearer <token>
持久:  localStorage 关闭浏览器不丢
过期:  24h（普通） / 30天（Remember Me）
```

### 多语言跨站切换策略
| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 用户站 Header/Footer 链接使用 `useClientLocale()` 动态语言 | ✅ 已实现 |
| 2 | LanguageSwitcher localStorage 存储，刷新当前页 + 主站同步 | ✅ 已实现 |
| 3 | Worker 路由支持 `/{locale}/compli-service/*` | ✅ 已实现（主站 middleware 处理 locale 前缀） |
| 4 | 用户站各语言翻译填充 | 远期 |

### Cookie 同意
**当前不需要** — JWT 存 localStorage 而非 cookie，无第三方追踪。
预留 `<CookieConsent />` 插槽，接入分析工具后再启用。

## 与主站的交叉链接

见主站 GOAL.md「关联项目」章节。

### 用户站 → 主站（已实现 ✅）
- Navbar 第二行全导航 → 主站对应页面
- WhatsApp 按钮 → 主站 WhatsApp
- Get a Quote 按钮 → 主站 /quote/

### 用户站 → 主站（待实现 ⏳）
- 自查报告末尾 "Need professional help? Get a quote →"
- 定价页 "Professional Service $500+" 档指向主站 packages

## 品牌一致

- 页头/页脚代码直接从主站 Navbar.tsx / Footer.tsx 复制适配
- 配色：`#1B365D` / `#D4AF37` / `#F4F6F9`
- 导航结构完全对齐：Services(下拉) | Industries(下拉) | About | Packages | FAQ | Insights | LanguageSwitcher
