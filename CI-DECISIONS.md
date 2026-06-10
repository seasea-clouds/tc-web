# CI Pipeline 决策记录

## 核心原则（2026-06-10 确立）
1. **所有检测脚本统一共享一套（ci-check.mjs）**，不各自维护。
2. **不得降低检测强度或缩小范围**。遇到不适合检查的场景，在共享脚本中添加精确特殊处理。
3. **检测出的问题必须修复**，非掩盖。

## Hreflang 架构统一（修复后）
| 项目 | 模式 | 说明 |
|------|------|------|
| Site | `--dir=out --skip-pattern=/blog/,404,_not-found` | 旧 blog 路径 + 错误页跳过 |
| Portal | `--dir=out --skip-pattern=404,_not-found` | 所有 /c/ 页面均有 hreflang |
| Blog | `--dir=out --skip-pattern=404,_not-found` | SSG 输出到 out/，统一用 --dir |

## 2026-06-10 修复的关键问题

### check-hreflang 脚本 bug（核心发现）
- 脚本搜索 `hreflang=`（小写），但 Next.js 16 RSC payload 使用 `hrefLang=`（驼峰）
- **三个站全都被影响了** — 每次检查都是 false pass
- 修复：正则改为 `/hreflang=|hrefLang=/g`

### Portal hreflang（以前说法是错误的）
之前说"Portal /c/ 由 Worker 注入 hreflang"，但实际上 Portal **SSG 本身就包含 hreflang**（首页和子页面都有）。之前的 0 检测是因为脚本 bug，不是架构问题。

### Blog hreflang 未输出（两处修复）
1. 父布局 `[locale]/layout.tsx` 缺少 `alternates` 导致根页面只有 96 hreflang 无 x-default → 已加 buildAlternates
2. 列表页 `[locale]/blog/page.tsx` 的 generateMetadata 只设了 canonical 覆盖了 segment layout 的 hreflang → 已加 buildLanguages

### Blog llms
Blog 无 llms 文件生成，`--llms-dir=public` 是多余的（auto-skip 不触发检查）。已移除。
