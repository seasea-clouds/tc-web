# CI Pipeline Rules

## 设计原则
- **所有检查脚本不得随意移除或简化** — 脚本存在的意义就是发现问题
- 每个项目（site / portal / blog）在各自的构建管道中运行适用的检查
- 如果某个检查在特定项目中不适用，需在文档中说明原因并提供替代方案

## 各项目构建管道检查清单

### Site (apps/site) — `sinotradecompliance.com`
| 检查 | 命令 | 说明 |
|------|------|------|
| convert-webp | `images/convert-webp.mjs` | 图片 WebP 转换 |
| hardcoded-domain | `check-hardcoded-domain.mjs --ci` | 禁止 dev pages.dev 域名硬编码 |
| search-index | `build-search-index.mjs` | 构建搜索索引 |
| search-translations | `build-search-translations.mjs` | 搜索翻译索引 |
| seo-patterns | `check-seo-patterns.mjs --ci` | SEO 模式检查 |
| next build | `next build` | Next.js 构建 |
| build-all | `build-all.mjs` | 多语言 SSG 导出 |
| seo-output | `check-seo-output.mjs --ci` | SSG 输出 SEO 检查 |
| clean-rsc | `clean-rsc.js` | 清理 RSC payload |
| hardcoded | `check-hardcoded.mjs --ci` | 禁止页面内硬编码英文文本 |
| hreflang | `check-hreflang.mjs --dir=out --ci` | hreflang 标签完整性 |
| console | `check-console.mjs --ci` | 禁止 console.log 残留 |
| rtl | `check-rtl.mjs --ci` | RTL 语言排版检查 |
| map-key | `check-map-key.mjs --ci` | 地图 key 检查 |
| jsonld | `check-jsonld.mjs --ci` | JSON-LD 结构化数据检查 |
| translations | `check-translations.mjs --ci --short` | 48 语言翻译质量检查 |

### Portal (apps/portal) — compliant-service / 主站 /c/ 代理
| 检查 | 命令 | 说明 |
|------|------|------|
| search-index | `build-search-index.mjs` | 构建搜索索引 |
| seo-patterns | `check-seo-patterns.mjs --ci` | SEO 模式检查 |
| next build | `next build` | Next.js 构建 |
| hardcoded-domain | `check-hardcoded-domain.mjs --ci` | 禁止 dev pages.dev 域名硬编码 |
| hardcoded | `check-hardcoded.mjs --ci` | 硬编码英文检测(全量扫描) |
| console | `check-console.mjs --ci` | 禁止 console.log 残留 |
| rtl | `check-rtl.mjs --ci` | RTL 排版检查 |
| translations | `check-translations.mjs --short --skip-locale-check` | Portal 48 语言翻译质量 |
| hreflang (SSG) | `check-hreflang.mjs --dir=out --skip-pattern=/c/,404,_not-found --ci` | 非 /c/ 路径 hreflang 检查（/c/ 由 Worker 注入） |
| hreflang (远程) | `check-hreflang.mjs --url=... --ci` | 部署后远程验证 Worker 注入的 hreflang |
| clean-rsc | `clean-rsc.js` | 清理 RSC payload |

**hreflang 特殊处理说明**: Portal SSG 输出的 `/c/` 路径不含 hreflang（由主站 Cloudflare Worker 在边缘端注入）。脚本中通过 `--skip-pattern=/c/,404,_not-found` 精确跳过这些路径，而非移除 hreflang 检查。部署后再用 `--url` 模式远程验证 Worker 注入的 hreflang。**检测脚本不简化、不移除、保留框架完整性。**

### Blog (apps/blog) — 主站 /blog/ 代理
| 检查 | 命令 | 说明 |
|------|------|------|
| lint | `next lint` | ESLint 检查 |
| search-index | `build-search-index.mjs` | 搜索索引 |
| seo-patterns | `check-seo-patterns.mjs --ci` | SEO 模式检查 |
| next build | `next build` | Next.js 构建 |
| hardcoded-domain | `check-hardcoded-domain.mjs --ci` | 禁止 dev 域名硬编码 |
| hreflang | `check-hreflang.mjs --next-dir=.next --ci` | hreflang 检查 |
| hardcoded | `check-hardcoded.mjs --ci` | 硬编码英文检测(全项目扫描) |
| console | `check-console.mjs --ci` | 禁止 console.log 残留 |
| llms | `check-llms.mjs --ci` | llms.txt 检查 |
| rtl | `check-rtl.mjs --ci` | RTL 排版检查 |
| translations | `check-translations.mjs --short` | 48 语言翻译质量 |

## 脚本维护规范
1. 脚本在 `packages/scripts/` 目录下
2. 所有检查脚本必须支持 `--ci` 模式（失败时 exit 1）
3. 新增检查必须加入对应项目的 build 管道
4. 移除检查需在文档中注明原因 + 替代方案
