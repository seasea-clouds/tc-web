# trade-web 技术决策与踩坑记录

## 翻译铁律

### 禁止翻译词表（NO_TRANSLATE）

| 类别 | 示例 |
|------|------|
| 品牌名 | SinoTrade Compliance, WhatsApp, WeChat, Tmall, LinkedIn |
| 人名 | David Zhang, Sarah Chen, Mike Wang, Leo Liu, John Smith |
| 机构缩写 | GACC, NMPA, CCC, CBEC, CIFER, MOA, CNCA, MEE |
| 标准编号 | GB 7718-2025 |
| 邮箱占位符 | you@company.com |

### Google Translate 短词修正

| 英文 | 中文 | 日文 |
|------|------|------|
| Home | 首页 | ホーム |
| Contact | 联系我们 | お問い合わせ |
| Services | 服务 | サービス |

详见 `/root/projects/trade/sinotradecompliance/NOTES.md` 完整表格。

### 翻译注意
- blog title ≤ 55 Unicode 字符
- 翻译后必须 `python3 scripts/check-translations.py` 验证
- 48 语言不允许英文 fallback

## 技术决策

### Turbofack 不支持 `workspace:*` 协议
npm 不支持 `workspace:*` 协议（那是 pnpm/yarn 的）。使用 npm workspaces 时直接 `"*"` 或省略版本号。
- 最终方案：tsconfig paths alias + `transpilePackages`

### Portal 无法使用 `[id]` 动态路由
SSG (`output: 'export'`) 模式下，动态路由必须提供 `generateStaticParams()`。
但报告 ID 是运行时生成的，无法预知。临时方案：保持 `?id=xxx` 查询参数方式。

### 共享组件 locale 兼容
主站用 `useParams().locale` 从 `[locale]` 路由取，Portal 没有 `[locale]` 路由。
- 共享 Navbar/Footer 加了 `locale` prop，Portal 传自己检测的 locale
- LanguageSwitcher 加 `onLocaleChange` 回调

### `--color-gold` 缺失
主站 Tailwind v4 主题中定义的是 `accent-gold: #B8960C`，但 Navbar 用了 `bg-gold`。
`bg-gold` 没有对应色值，按钮背景一直是透明的。
- 修复：加入 `--color-gold: #D4AF37`

### `||` 和 `??` 混用
`const locale = propLocale || params?.locale ?? 'en'` 在 Turbopack 中报语法错误。
需要加括号：`propLocale || (params?.locale ?? 'en')`

### 翻译引擎
翻译调用 `/root/projects/translate-tool/` 双渠道 Google Translate。
Quota 查看：`source /root/projects/.venv/bin/activate && python scripts/translate.py quota`

### 环境变量
所有秘密变量统一在 `~/.openclaw/.env`。

CF Pages 已配置变量：
- CREEM_API_KEY / CREEM_WEBHOOK_SECRET
- CREEM_PRODUCT_ID_SINGLE / CREEM_PRODUCT_ID_SUBSCRIBE
- RESEND_API_KEY / EMAIL_FROM
- NODE_VERSION=22

## 踩坑记录

### Worker `_middleware.ts` 匹配规则
旧规则匹配 `/{locale}/compli-service/` 并剥离 locale 发送给 Portal。
改成 `/{locale}/c/` 后要保留 locale 透传，不能剥离。

### `functions/_middleware.ts` 改名
Next.js 16 开始 middleware 文件名从 `middleware.ts` 改为 `_middleware.ts`（CF Pages 格式）。
主站的 `middleware.ts` 是 Next.js 自身 middleware，`functions/_middleware.ts` 是 CF Pages 的。

### 重复路由导致构建失败
拷贝文件到 `[locale]/c/` 后忘记删除原位置的页面文件。
两个地方都有 `page.tsx` → 路由冲突 → AuthProvider 找不到。
删除原文件后解决。

### Schema SQL 换行问题
将 sessions 表 SQL 追加到 schema.ts 时，写在了模板字面量 `SCHEMA_SQL` 外面。
TypeScript 把 SQL 语句当代码解析 → 编译错误。
修复：移入模板字面量内，并用英文注释。

### 语言同步提醒
Portal 切语言后，标签页不自动刷新。用户需要手动点 LanguageSwitcher。
要等 Phase 4 服务端 locale 路由上线后，URL 变语言自动变。
