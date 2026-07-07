# Admin TASK — CF Analytics 迁移

## 目标

停止自采集 `page_views`，改为从 **Cloudflare GraphQL API** 获取 PV/UV/地域/页面/浏览器/OS 等数据。

## 实施方案

### 数据源

| 数据 | CF GraphQL 节点 | 采样？ |
|:---|:---|:---:|
| 日汇总 PV/UV/请求量/流量/缓存 | `httpRequests1dGroups` | 100% |
| 每小时 PV/UV | `httpRequests1hGroups` | 100% |
| 地域分布（25国） | `sum.countryMap` | 100% |
| 浏览器分布（8种） | `sum.browserMap` | 100% |
| 状态码分布 | `sum.responseStatusMap` | 100% |
| 页面路径（500+） | `httpRequestsAdaptiveGroups.clientRequestPath` | ~67% 采样 |
| OS/设备类型 | `httpRequestsAdaptiveGroups.userAgentOS/clientDeviceType` | 采样 |

### 表结构变更

**`daily_page_stats`（新增列）**
- `total_requests`, `total_bytes`, `cached_requests` — CF 原始数据
- `browser_data`, `status_code_data`, `os_data`, `device_data` — NEW
- `source` — 标记来源 `cf_api`
- 旧 `channel_data` 列保留但不使用

**`hourly_page_stats`（新建）**
```
date TEXT, hour INTEGER, pv INTEGER, uv INTEGER, requests INTEGER
PRIMARY KEY(date, hour)
```

### 文件变更

| 操作 | 文件 |
|:---|:---|
| **新建** | `apps/admin/functions/lib/cf-analytics.ts` |
| **重写** | `apps/admin/functions/api/admin/analytics.ts` |
| **修改** | `apps/portal/src/core/db/schema.ts` |
| **修改** | `apps/admin/src/app/dashboard/page.tsx` |
| **修改** | `apps/site/functions/_middleware.ts`（删除追踪段） |
| **删除** | `apps/admin/functions/api/admin/track.ts` |
| **删除** | `apps/admin/functions/api/admin/aggregate.ts` |
| **删除** | `apps/admin/functions/lib/aggregate.ts` |

### 数据流程

```
首次访问 analytics 端点:
  1. 检查 daily_page_stats 中 source='cf_api' 的最新日期
  2. 从最后日期+1 到昨天的全量缺失日 → CF httpRequests1dGroups → 存储
  3. 同时拉取页面路径 → CF httpRequestsAdaptiveGroups → 存储

每次访问:
  1. 检查当天已完成但未获取的整点
     (UTC 当前小时-1 之前的所有小时)
  2. 从 CF httpRequests1hGroups 获取缺失小时 → 存储
  3. 从 D1 读取并返回
```

### 仪表盘变化

- ❌ 去除「渠道来源」卡片
- ❌ 去除「⚡ 立即聚合」按钮
- ✅ 新增「浏览器分布」卡片（代替渠道来源位置）
- ✅ 新增「OS/设备分布」卡片
- ✅ PV/UV 数据 100% 准确（原 30%）
- ✅ 数据集成状态标签更新

## 状态

<!-- 2026-07-07 17:30 开始实施 -->
