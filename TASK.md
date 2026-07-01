# TASK.md

> 当前时间：2026-07-01 18:21 (Asia/Shanghai)

---

## ✅ 已完成

### P1: 翻译导出 + 合并 ✅ (7a7d21c)
### P2: 恢复 `build:ci` 模式 ✅ (ed81c18)
### P3: 修复登录/注册/订阅页 + 删除旧路由 billing ✅ (fddf6d2)
### P4: 移除 Dashboard 系列页面 ✅ (5f16379)

---

## 🟡 待执行（审计 9 项）

### 🔴 P0: 统一 check-client.tsx 为公共组件 🔴

6 个检查工具各有一份几乎相同的 `check-client.tsx`（~350行），差异仅 2 行：import 的 check 函数 + 标题 key。
- GACC 已用 theme tokens，其他 5 个仍用硬编码色值
- 抽取 `CheckClientShell` 公共组件 → 6 个页面各剩 ~10 行
- 波及文件：
  - `apps/portal/src/app/[locale]/c/check/{ccc,gacc,label,nmpa,crossborder,trademark}/check-client.tsx`
  - 新建 `apps/portal/src/core/check/CheckClientShell.tsx`

### 🟧 P1: Dashboard 命名空间死代码清理

Dashboard 路由已删，但 `/c/me/` 仍用 `useTranslations('Dashboard')`。
- 30 keys 中仅 6 个在用（myReports, viewReportsDesc, subscription, manageSubscriptionDesc, settings, accountPreferences）
- 24 keys 已成死代码
- 方案：迁移 `/c/me/` 到 `useT('Report')` → 删除整个 Dashboard 命名空间

### 🟧 P1: 登录/注册页改用 theme tokens

Login/Register 页面仍用 `text-[#1B365D]`、`text-[#D4AF37]` 硬编码色值
- 改为 `text-primary-navy`、`text-gold`
- 波及文件：`apps/portal/src/app/[locale]/c/login/page.tsx`、`apps/portal/src/app/[locale]/c/register/page.tsx`

### 🟧 P1: 翻译任务跟踪

| 任务 | key | 状态 |
|------|-----|------|
| `portal-auth-privacy-v1` | Auth.agreeToPrivacy / privacyPolicy | 🟡 4.3% |
| `portal-dashboard-planstatus-v1` | Dashboard.plan / status | ✅ 已合并 |
| `portal-report-planmap-v1` | Report.planMonthly/Yearly, statusActive/Canceled/PastDue | 🟡 40% |

### 🟨 P2: 清理空 admin 目录

`apps/admin/` 无 `src/`，纯占位。删除或加 README 标记。

### 🟨 P2: postdeploy-check 硬编码域名修复

`package.json` 中写死了 `https://sinotradecompliance.com/en/c/`
- 方案 A：新建 `packages/scripts/check-hreflang-portal.mjs`
- 利用 `CF_PAGES_URL` 自动检测域名
- 波及：`packages/scripts/check-hreflang-portal.mjs`（新建）、`apps/portal/package.json`

### 🟩 P3: GOAL.md 「四站」表述修正

GOAL.md 提到「四站（含 admin）」，但 admin 仍是空占位
- 改为「三站 + admin（占位中）」

### 🟩 P3: 其他零散优化

- `TASK.md` 本文未提交（解决中）
- `NOTES.md` 用户页设计规范中「Dashboard 页面」表述应删除

---

### 故障预案

- **翻译失败/超时：** `translate-tool retry -n "<task-name>"`
- **CI 缺失 key：** `npm run build 2>&1 | grep "缺失于"` 定位
- **部署后英文 fallback：** 硬刷新浏览器 + 检查 locale JSON
