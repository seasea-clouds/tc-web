# trade-web 项目目标与规则

## 核心目标

将主站（sinotradecompliance.com）和用户站（Portal）整合到同一个 monorepo 中，共享 UI 组件，统一多语言路由，独立部署，互不干扰。

## 品牌 VI（不可违反）

| 项 | 值 | 用途 |
|----|-----|------|
| 主色 | `#1B365D` | 海军蓝，品牌主色 |
| CTA 强调 | `#D4AF37` | 金色（accent-gold / gold） |
| 底色 | `#F4F6F9` | 冰白 |
| 炭灰 | `#333333` | 正文文字 |
| 银灰 | `#7F8C8D` | 次要文字 |
| ❌ 禁用 | `#000000` | 纯黑不可使用 |

## 硬性规则

- ❌ **不展示价格** — 所有页面不出现具体定价数字
- ❌ **不展示交付周期** — 不出现具体天数/周数
- ✅ **48 语言全覆盖**，禁止英文 fallback（品牌名除外）
- ✅ 品牌名 "SinoTrade Compliance" 所有语言保持英文
- ✅ 联系方式统一：david@sinotradecompliance.com
- ✅ 部署后必须验证线上状态（`grep __next_error__`）

## 关键规则

### 目录原则
- `web/` 是 monorepo 根，同级有 `crm/`、`prospect/`、`knowledge/`
- `apps/*` 各应用独立可部署
- `packages/*` 共享代码包
- 原始目录 `sinotradecompliance/`、`compli-service/` 保留未改动

### 路由规则
- **主站：** `/{locale}/...`（例如 `/zh/services/gacc/`）
- **Portal：** `/{locale}/c/...`（例如 `/zh/c/check/gacc`）
- **Admin（未来）：** `/{locale}/admin/...`
- Portal 不使用 `basePath`，Worker 代理透传完整路径

### 多语言
- 所有页面使用 `[locale]` 服务端路由
- 翻译文件在 `messages/*.json`，48 语言
- 每个页面导出 `generateStaticParams` → 48 × SSG
- 语言同步通过 URL 路径，不依赖 localStorage

### 共享组件
- Navbar/Footer/LanguageSwitcher 在 `packages/ui/`
- 两站通过 `@trade/ui` 引用
- 支持 `locale` prop，兼容 `useParams()` 和 `useLocale()`
- 改一处两站同步更新

### 持久化
- 报告数据存 D1 SQLite，不存 localStorage
- Check 表单 → `POST /api/report/save` → D1
- 报告页 → `GET /api/report/[id]` → D1
- 支持跨浏览器重复查看

### 认证
- httpOnly Cookie Session，不存 localStorage JWT
- Login/Register API 直接设置 `Set-Cookie`
- `/api/auth/me` 验证 cookie 返回用户
- `credentials: 'include'` 自动携带 cookie

### 部署
- 三个独立 CF Pages 项目，各配 Root directory
- 主站 `apps/site` + Portal `apps/portal` + Admin `apps/admin`
- 改 `packages/ui/**` 触发两站自动部署

## SEO + GEO 要求

- 每页独立 title/description
- Open Graph + Twitter Card 标签
- JSON-LD 用 `<script>` 标签（不用 next/script）
- sitemap.xml 含全部 URL + hreflang
- 每页唯一 H1
- GEO：Q&A + "How it works" + 定义列表
