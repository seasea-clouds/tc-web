# Admin NOTES — 技术决策与注意事项

## 技术决策

### Proxy 架构
- Admin 运营后台通过主站 `_middleware.ts` 代理访问（`/admin/*` → `trade-web-admin.pages.dev`）
- API 路径 `/api/admin/*` 同样通过 `proxyFetch()` 代理（已修复：之前裸 `fetch()` 默认 GET，POST 请求返回 405）

### D1 数据库
- 共享 Portal 项目的 D1 数据库（binding name: `DB`）
- Admin 使用独立的 D1 表（`admin_users`, `admin_logs` 等），不与 Portal 用户数据冲突

### Turnstile 人机验证
- Admin 使用独立 Turnstile widget，site key: `0x4AAAAAAAewC-TLy6pJ7WgB`
- 与 Portal 的 Turnstile 不同（Portal 用的是另一个 widget）
- **当前问题：** `TURNSTILE_SECRET_KEY` 环境变量未配置。代码会自动跳过验证（`if (env.TURNSTILE_SECRET_KEY && turnstileToken)`），登录功能正常，但缺少人机验证

### 静态导出
- `output: 'export'` + `basePath: '/admin'`，产出到 `out/admin/` 目录
- CF Pages Functions 负责 API 路由（不在 Next.js 路由系统中）

## 踩坑记录

### import 路径
移动 `functions/api/auth/*` → `functions/api/admin/auth/*` 后，import 路径需多一层：
`../../lib/admin-session` → `../../../lib/admin-session`

### package-lock.json
更新依赖后必须重新生成 `package-lock.json`，否则 CF Pages 的 `npm ci` 会失败。

### Turnstile 脚本加载
Turnstile script 不能放在 `<head>` 的 `<script>` 标签中（Next.js RSC 渲染忽略），必须通过 `document.createElement('script')` 动态加载。

### CF Pages 自动构建故障
GitHub 推送触发的自动构建持续失败（`clone_repo` 成功但 `build` 阶段报错）。当前只能 `wrangler pages deploy` 手动上传。`functions/` 目录仅在 wrangler 部署时生效，`next build` 会把它当作页面文件，但不影响部署。

### _routes.ts 死代码
`functions/api/admin/auth/_routes.ts` 把 `onRequest` 重命名为 `loginHandler` 等，导致 CF Pages Functions 路由匹配失败。已删除（由独立函数文件按路径匹配）。
