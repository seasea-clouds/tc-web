# GOAL.md — Portal 合规自查用户站

## 项目定位

**Portal 是 SinoTrade Compliance 主站的获客-教育-转化漏斗第一步，不是一个独立产品。**

```
用户旅程：
  免费自查 ($0)  →  付费报告 ($1)  →  联系专家 ($500+)
  ─────────────     ───────────      ────────────────
  获客入口           教育转化          商业转化（主站套餐）
```

## 核心规则

| 规则 | 说明 |
|------|------|
| ✅ 品牌一致 | 页头页脚与主站完全一致（`@trade/ui` 共享组件）|
| ✅ 48 语言 | 48 语言框架（next-intl）+ LanguageSwitcher |
| ✅ 漏斗定位 | 不自称独立产品，每份报告引导"联系专家"→ 主站 /quote/ |
| ✅ 免费自查 | 免登录入口 |
| ✅ 子路径 | `/{locale}/c/` 部署，主站 Worker 代理 |

## 六大服务模块

| 模块 | 输入 | 输出 |
|------|------|------|
| **GACC 食品注册** | 品类、来源国、产品描述 | 是否需要注册 + 材料清单 |
| **中文标签合规** | 品类、规格 | 标签要求清单 |
| **CCC 认证** | 产品类型、HS编码 | 是否需要 CCC + 路径 |
| **化妆品备案** | 品类、成分 | NMPA 备案分类 + 清单 |
| **跨境电商** | 品类、平台 | 合规要求 + 所需材料 |
| **品牌保护** | 商标、品类 | 保护策略 + 注册建议 |

## 已知问题（待修复）

### 1. 多语言不全
- 6 个 check-client.tsx 中大量文本（标题、label、placeholder）硬编码为英文
- Check 命名空间下的翻译仅填充了少数字段（zh.json 中 100+ key 仍是英文原文）
- 表单页面的 `<h1>`、`<p>`、label、placeholder 等使用 `t()` 时 key 在 .json 中未翻译

### 2. 检查流水线未发现问题
- `check-hardcoded.mjs`：扫描 JSX 文本子节点，但 label 标签外文本或动态渲染可能漏检
- `check-translations.mjs`：只检查 messages JSON，不检查 .tsx 文件中漏调 `t()` 的地方
- **两个脚本之间存在盲区：messages 有 key 但值为英文原文 → check-translations 应报 fallback 但 IGNORE_FALLBACK 规则豁免过多**

### 3. 提交后页面不跳转
- 提交表单后 `handlePayment` 会执行 `window.location.href = "/" + window.location.pathname.split('/')[1] + "/c/report/?id=" + reportId;`
- 但在 portal 独立域名上，这会导致跳转到 portal 本身而非主站
- 且在开发模式下 `fetch('/api/report/save')` 可能失败

## 品牌一致

- 共享组件 `@trade/ui`（Navbar/Footer/LanguageSwitcher/...）
- 配色：`#1B365D` / `#D4AF37` / `#F4F6F9`
- 导航结构完全对齐：Services(下拉) | Industries(下拉) | About | Packages | FAQ | Insights | LanguageSwitcher
