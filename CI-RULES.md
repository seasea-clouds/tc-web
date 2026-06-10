# CI Pipeline Rules

## 设计原则（2026-06-10 确立）
1. **所有检测脚本统一在 `packages/scripts/`**，不得各自维护。
2. **每个项目通过 `ci-check.mjs --project=X` 调用同一套检查**，使用参数处理项目差异（如 portal hreflang 的 `--skip-pattern`）。
3. **不得降低检测强度或缩小范围**。遇到不适合检测的场景，在共享脚本中添加精确特殊处理（如 `--skip-pattern`），而非移除检查或缩小 scope。
4. **检测出的问题必须修复**，而非掩盖或绕过。

## 统一检查入口：`ci-check.mjs`

| 项目 | 调用方式 | 说明 |
|------|----------|------|
| site | `ci-check.mjs --project=site --out-dir=out --ci` | SSG 全量输出，直接托管（跳旧blog页） |
| portal | `ci-check.mjs --project=portal --out-dir=out --ci` | SSG 输出，/c/ 路径全有 hreflang |
| blog | `ci-check.mjs --project=blog --out-dir=out --ci` | SSG 输出（与 site/portal 统一模式） |

`ci-check.mjs` 运行以下全部检查（按顺序）：
| # | 检查脚本 | 适用项目 | 说明 |
|---|---------|----------|------|
| 1 | `check-seo-patterns.mjs` | 所有 | page.tsx 导出 generateMetadata、alternates 完整性 |
| 2 | `check-hardcoded-domain.mjs` | 所有 | 禁止 dev pages.dev 域名硬编码 |
| 3 | `check-hardcoded.mjs` | 所有 | 全量扫描硬编码英文字符串 |
| 4 | `check-console.mjs` | 所有 | 禁止 console.log 残留 |
| 5 | `check-rtl.mjs` | 所有 | RTL 语言排版检查 |
| 6 | `check-map-key.mjs` | 所有 | JSX .map() 缺少 key 属性检查 |
| 7 | `check-jsonld.mjs` | 所有 | JSON-LD 结构化数据完整性（已扩展至全项目） |
| 8 | `check-hreflang.mjs` | 所有 | hreflang 标签完整性（portal 用 --skip-pattern 跳过了 Worker 路由的 /c/ 路径） |
| 9 | `check-llms.mjs` | 有 llms.txt 的 | llms.txt 质量检查 |
| 10 | `check-seo-output.mjs` | 所有 | 构建后标题/描述/canonical 检查 |
| 11 | `check-translations.mjs` | 所有 | 48 语言翻译质量检查（根据项目跳过不适用的模块：portal 跳过 locale consistency，blog 跳过 industry-meta+portal） |
| 12 | `clean-rsc.js` | 有 out/ 的 | 清理 RSC payload .txt 文件 |

## 各项目构建管线（简化后）

```
# Site (apps/site)
  convert-webp → build-search-index → build-search-translations → next build → build-all
  → ci-check.mjs --project=site --out-dir=out --ci

# Portal (apps/portal)
  build-search-index → next build → ci-check.mjs --project=portal --out-dir=out --ci
  → deploy → postdeploy-check (远程 hreflang 验证)

# Blog (apps/blog)
  lint → build-search-index → next build → ci-check.mjs --project=blog --out-dir=out --ci
```

## 项目间差异处理

| 差异点 | 处理方式 |
|--------|----------|
| Site hreflang | `--skip-pattern=/blog/,404,_not-found`（跳旧 blog 页面+错误页） |
| Portal hreflang | `--skip-pattern=404,_not-found`（跳非内容页） |
| Blog hreflang | `--skip-pattern=404,_not-found`（跳非内容页） |
| Portal translations | `--skip-locale-check` 跳过 locale consistency（portal messages 独立） |
| Blog translations | `--skip-industry-meta --skip-portal-check`（blog 仅有 Blog+Cookie 命名空间） |
| Site translations | 全量检查（所有模块都运行） |
| llms.txt | auto-detect（存在则检查，不存在则跳过） |

## 维护规范
1. 所有检查脚本在 `packages/scripts/`。
2. 新增检查必须在 `ci-check.mjs` 中注册。
3. 所有检查脚本必须支持 `--ci` 模式（失败时 exit 1，clean-rsc 除外）。
4. 项目差异通过 `--project` 参数 + 脚本内部特殊处理实现，不创建脚本副本。
