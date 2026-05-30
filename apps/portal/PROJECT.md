# SinoTrade Compliance 官网用户后台（Compli-Service）

> **位置：** `/root/projects/trade/compli-service/`
> **用途：** 六大合规自查工具 — 海外出口商自查产品是否需要中国合规认证
> **独立部署：** GitHub 独立仓库 → Cloudflare Pages → Worker 路由到 `sinotradecompliance.com/compli-service/*`

## 新会话指引

先读此文件 → [GOAL.md](GOAL.md) → [TASK.md](TASK.md)

## 项目定位

**China Compliance Self-Check** — 海外出口商自查产品是否需要中国合规认证的工具。

六大模块：GACC 食品注册、中文标签合规、CCC 认证、化妆品备案、跨境电商、品牌保护

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js (SSG/SSR) + TypeScript |
| 样式 | Tailwind CSS（复用主站品牌色）|
| 部署 | Cloudflare Pages + Pages Functions |
| 数据库 | Cloudflare D1 (SQLite) |
| 支付 | Creem（第一期，松耦合可换） |
| 邮件 | Resend（第一期，松耦合可换） |
| 人机验证 | Cloudflare Turnstile |

## 品牌一致

| 项 | 值 |
|----|-----|
| 主色 | `#1B365D` 海军蓝 |
| 强调色 | `#D4AF37` 金色 |
| 底色 | `#F4F6F9` 冰白 |
| 字体 | 与主站统一 |
| 顶栏 | 独立但风格一致，含"返回主站"链接 |

## 入口文件

| 文件 | 说明 |
|------|------|
| [GOAL.md](GOAL.md) | 项目目标、核心规则、定价 |
| [TASK.md](TASK.md) | 任务清单、当前进度 |
| [NOTES.md](NOTES.md) | 技术决策、踩坑记录 |
| [SOP.md](SOP.md) | 标准操作流程 |

## 关联项目

- **官网主站:** [sinotradecompliance/](../sinotradecompliance/PROJECT.md)
- **CRM:** [crm/](../crm/PROJECT.md)
