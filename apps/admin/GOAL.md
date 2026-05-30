# Admin 项目目标

## 核心目标

管理后台，内部使用。管理用户、报告、订阅、系统配置。

## 关键规则

### 路由
- 主站 Worker 代理 `/{locale}/admin/*` → Admin CF Pages
- 可不做多语言（内部工具，英语即可）

### 认证
- 复用 Portal 的 Session Cookie + `/api/auth/me`
- 需要管理员角色字段（未来加）

### 部署
- 独立 CF Pages 项目，Root: `apps/admin`
- 构建命令：`npx next build`
