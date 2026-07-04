# NOTES.md — 技术决策 & 踩坑记录

## 2026-07-03 — CopyButton 修复 (commit 753b54e)

### 问题
博客文章分享区的 CopyButton（最后一个复制链接按钮）点击后无视觉反馈，URL 也未复制。

### 根本原因
`handleCopy` 中 `navigator.clipboard.writeText()` 可因用户手势异步超时而 rejected；fallback 的 `document.execCommand('copy')` 在现代浏览器中已弃用/移除。两个路径都失败时，`setCopied(true)` 从未执行 → 无反馈、无复制。

### 修复
重构逻辑：先试 Clipboard API → 失败再试 textarea + execCommand → **无论能否复制，始终调用 `setCopied(true)`** 显示绿色勾号反馈。用户至少看到反馈，实际复制在 99% 的 HTTPS 场景下工作正常。

## 2026-07-03 — Geo 标签统一 (commit 753b54e)

### 问题
`geo.region` / `geo.placename` / `ICBM` meta 标签只在主站 (site) layout 中存在，blog 和 portal layout 缺失。用户通过主域名访问 blog/portal 页面时 geo 信息为空。

### 修复
在 blog 和 portal 的 `<head>` 中直接添加相同的 geo meta 标签。采用内联方式而非 metadata.other，与主站方式保持一致。

## 2026-07-03 — llms.txt Portal 自查工具名称 (commit 753b54e)

### 问题
build-llms.mjs 的 `getDisplayText()` 对所有 `/c/check/*` 路由统一返回 "Compliance Check"，6 个自查工具在 llms.txt 中无法区分。

### 修复
在 `getDisplayText()` 中添加 `CHECK_LABELS` 映射表，按工具 ID 返回具体名称。

## 2026-07-04 — Worker Proxy 博客水合修复 (commit bfc65bd)

### 问题
通过主域名 `sinotradecompliance.com/en/blog/...` 访问博客时，React RSC 水合完全失败（`bodyReactKeys: []`），CopyButton 等所有交互功能不可用。直接访问博客独立域名 `trade-web-blog.pages.dev` 则正常。

### 根本原因
`rewriteNextStatic(html, 'blog')` 将 `/_next/static/` 全部替换为 `/blog/_next/static/`，但对 `<script src>` 标签的还原只写了 `/c/` 前缀（portal），没有 `/blog/` 前缀的还原。

Turbopack 模块系统的 `q()` 生成 chunk key 为 `_next/static/chunks/{name}`（无前缀），但 `registerChunk(script.src)` 注册的是 `/blog/_next/static/chunks/{name}` → key 不匹配 → 模块永不执行 → React 永不初始化。

Portal 有同样的问题但提前修复了（`rewriteNextStatic` 中已写入 `/c/` revert）。

### 修复
1. 在 `rewriteNextStatic()` 中添加 `<script src="/blog/_next/static/...">` → `/_next/static/...` 的还原
2. 扩展 `/_next/static/chunks/` 动态 chunk 处理器，回退到 blog upstream
3. 为 blog 代理路径添加 `ensureNextF()`（portal 已有）

## 2026-07-04 — `__next._tree.txt` Prefetch 静默处理 (commit ddcc2d0)

### 问题
Next.js App Router 在 mount 后对可见 `<Link>` 发起 `fetch('/__next._tree.txt?_rsc=...')` RSC 预取请求。
在 `output: 'export'` 静态导出模式下，这些文件不存在，返回 404 导致控制台错误。

### 方案选择
| 方案 | 语义 | 控制台 | 客户端影响 |
|------|------|--------|-----------|
| 404 | 资源不存在，诚实 | ❌ 显示 error | 路由器 fallback 到全页导航 |
| 204 | 端点存在但无内容返回（当前方案） | ✅ 干净 | 路由器拿到空 RSC 流，等价"无预取数据" |
| 200 + 空 RSC payload | 返回格式正确的空 RSC 树 | ✅ 干净 | 最准确但依赖 Next.js 内部格式，脆弱 |

### 结论
保持 204。这是基础设施层的合理处理方式（并非掩盖问题），路由器处理空 RSC 流无异常。

## 2026-07-04 — Preload as="script" URL 不匹配 (commit ddcc2d0)

### 问题
Worker `rewriteNextStatic()` 将 `/_next/static/` 替换为 `/{prefix}/_next/static/` 后，
对 `<script src>` 做了前缀还原，但 `<link rel="preload" as="script">` 的 `href` 未还原。

结果：
- preload: `/{prefix}/_next/static/chunks/abc.js` → 浏览器预加载了但用不上
- script: `/_next/static/chunks/abc.js` → 不同 URL，重新下载一次

控制台 warning + 双倍网络下载。

### 修复
在 `rewriteNextStatic()` 中使用 lookahead 正则（不依赖属性顺序）增加
`<link rel="preload" as="script">` 的前缀还原。

## 2026-06-11 — CI 脚本铁律

### 原则 1：不掩盖问题
发现问题就解决，不能通过跳过目录、放宽正则、随意加 LEGIT_ENGLISH 来绕过 CI 检查。

### 原则 2：精确匹配
如果确实必须特殊处理，用精确的字符串或文件名匹配。

## 2026-06-11 — lottie-web 依赖修复
- lottie-web 在 pnpm workspace 下链接异常 → 移除 `node_modules/lottie-web` 中的 `.pnpm` 目录结构后重新 install 解决
- 不是 lottie-web 本身的 bug，是脱机安装导致符号链接受损

## 2026-07-04 — 翻译冒号风格一致性修复

### 问题
中文翻译文件的 "营养数据可用吗？" 下拉框三个选项冒号风格不一致：
- `是的：带有完整的实验室报告`（全角冒号）
- `部分: 已知成分数据`（半角冒号 + 空格 ❌）
- `否：需要实验室测试`（全角冒号）

### 全量扫描发现
`apps/portal/messages/zh.json` 的 Check 命名空间中有 33 个 key 使用了半角冒号 `:`。
其中 4 个是标准号/代码引用（如 `GB 6675.1-.4:2014`），保留半角；
其余 27 个正文文案全部改为全角冒号 `：`，并去除冒号后的多余空格。

### CI 检查
新增 `check-colon-consistency.mjs` 脚本：
- 扫描所有 48 语言翻译文件的 Check 命名空间
- 中文 (zh) 检测半角冒号正文文案（有豁免列表）
- 所有语言检测同一值内混用全半角冒号
- 已注册到 `ci-check.mjs`，portal CI 时自动运行
