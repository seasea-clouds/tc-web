# TASK.md

> 当前时间：2026-07-01 17:31 (Asia/Shanghai)

---

## ✅ 已完成

### P1: 翻译导出 + 合并 ✅ (7a7d21c)
### P2: 恢复 `build:ci` 模式 ✅ (ed81c18)

### P3: 修复登录/注册页 + 订阅页翻译 + 删除旧路由 billing ✅ (fddf6d2)

- 登录/注册页底部添加「同意隐私政策」链接（匹配当前语言）
- 订阅页修复：`Report.periodStart` 翻译 + plan/status 映射翻译
- 删除旧路由 `/c/dashboard/billing/`
- 仪表盘「计费和订阅」→ 指向 `/c/me/subscription`
- `check-seo-patterns.mjs` 移除 `/c/dashboard/billing/`
- 补全 en.json source key（Auth, Dashboard, Report 命名空间）
- 已提交 3 个翻译任务（46 语言 × 9 key）

### P4: 移除 Dashboard 系列页面 ✅ (5f16379)

- 删除 `/c/dashboard/` 首页 + `/c/dashboard/reports/`
- 登录/注册后跳转 → `/c/me`
- 清理脚本引用（check-seo-patterns/check-seo-output/discover-routes）
- 清理 AutoBreadcrumb `dashboard` / `billing` 映射
- Me 系列页面（`/c/me/`）仍使用 Dashboard i18n 命名空间

---

## 🟡 进行中

### P5: 翻译任务进行中

| 任务 | key | 状态 |
|------|-----|------|
| `portal-auth-privacy-v1` | `agreeToPrivacy`, `privacyPolicy`（Auth） | 🟡 翻译中 |
| `portal-dashboard-planstatus-v1` | `plan`, `status`（Dashboard） | 🟡 翻译中 |
| `portal-report-planmap-v1` | `planMonthly`, `planYearly`, `statusActive`, `statusCanceled`, `statusPastDue`（Report） | 🟡 翻译中 |

**完成后：** 导出 → 合并到 47 个 locale JSON → git push

---

### 故障预案

- **翻译失败/超时：** `translate-tool retry -n "<task-name>"`
- **CI 缺失 key：** `npm run build 2>&1 | grep "缺失于"` 定位
- **部署后英文 fallback：** 硬刷新浏览器 + 检查 locale JSON
