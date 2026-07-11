# Admin TASK

## 状态：全部已完成

- [x] 1. 数据分析迁移：移除 D1 缓存层，所有数据直接从 CF Analytics GraphQL API 拉取（2026-07-11）
- [x] 2. 订阅状态"canceled"翻译 → "已取消"（已在 statusLabel 中正确映射）
- [x] 3. 订阅管理 Invalid Date 修复 — 创建 safeDate() 工具函数处理 ISO/SQLite 两种日期格式
- [x] 4. 报告管理：详情改为独立页面（`/admin/report-detail?id=xxx`）；新增"原始报告"按钮
- [x] 5. 报告管理模块下拉改为中文显示
- [x] 6. 订阅管理手动添加：user_id → 用户邮箱；新增开始/结束日期；去掉年度订阅
- [x] 7. 用户管理改为独立详情页面（`/admin/user-detail?id=xxx`）
- [x] 8. 所有列表页添加分页，默认25行（reports/subscriptions/users 均已支持）
- [x] 9. Dashboard 页面热门路径翻译补全：SEGMENT_LABELS 从 14 条扩展到 44 条，覆盖 site/portal/blog/admin 所有路径段
- [x] 10. Dashboard API 清理：移除错误的 `pv: reports * 3` 和 `uv: new_users` 假数据字段（前端从未使用，但造成混淆）
- [x] 2. 订阅状态"canceled"翻译 → "已取消"（已在 statusLabel 中正确映射）
- [x] 3. 订阅管理 Invalid Date 修复 — 创建 safeDate() 工具函数处理 ISO/SQLite 两种日期格式
- [x] 4. 报告管理：详情改为独立页面（`/admin/report-detail?id=xxx`）；新增"原始报告"按钮
- [x] 5. 报告管理模块下拉改为中文显示
- [x] 6. 订阅管理手动添加：user_id → 用户邮箱；新增开始/结束日期；去掉年度订阅
- [x] 7. 用户管理改为独立详情页面（`/admin/user-detail?id=xxx`）
- [x] 8. 所有列表页添加分页，默认25行（reports/subscriptions/users 均已支持）

<!-- 2026-07-07 完成 -->
