# Admin TASK — 8项优化 (2026-07-07)

## 状态：全部已完成并推送

- [x] 1. CF自动回填修复 — 修复 cf-analytics.ts 中 graphql 函数返回 `body` 而非 `body.data` 的 bug；改为无条件调用 ensureDailyCFCache/ensureHourlyCFCache
- [x] 2. 订阅状态"canceled"翻译 → "已取消"（已在 statusLabel 中正确映射）
- [x] 3. 订阅管理 Invalid Date 修复 — 创建 safeDate() 工具函数处理 ISO/SQLite 两种日期格式
- [x] 4. 报告管理：详情改为独立页面（`/admin/report-detail?id=xxx`）；新增"原始报告"按钮
- [x] 5. 报告管理模块下拉改为中文显示
- [x] 6. 订阅管理手动添加：user_id → 用户邮箱；新增开始/结束日期；去掉年度订阅
- [x] 7. 用户管理改为独立详情页面（`/admin/user-detail?id=xxx`）
- [x] 8. 所有列表页添加分页，默认25行（reports/subscriptions/users 均已支持）

<!-- 2026-07-07 完成 -->
