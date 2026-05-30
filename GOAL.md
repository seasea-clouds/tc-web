# trade-web 项目目标与规则

## 核心目标

将主站（sinotradecompliance.com）和用户站（Portal）整合到同一个 monorepo 中，共享 UI 组件，统一多语言路由，独立部署，互不干扰。

## 关键规则

### 目录原则
- `web/` 是 monorepo 根，同级有 `crm/`、`lead-gen/`、`knowledge/`
- `apps/*` 各应用独立可部署
- `packages/*` 共享代码包
- 原始目录 `sinotradecompliance/`、`compli-service/` 保留未改动

### 路由规则
- **主站：** `/{locale}/...`（例如 `/zh/services/gacc/`）
- **Portal：** `/{locale}/c/...`（例如 `/zh/c/check/gacc`）
- **Admin（未来）：** `/{locale}/admin/...`（例如 `/zh/admin/users`）
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
