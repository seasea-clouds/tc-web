# trade-web 注意事项与技术参考

## 版本号统一管理（VERSION 文件）

版本号支持方案：

- 单源：`<root>/VERSION` 文件是整个 monorepo 版本号的唯一来源
- 各子项目 `package.json#version` 已改为文本占位符 `"from ../../VERSION"`，表明版本来自根目录的 VERSION 文件
- 注入脚本：`packages/scripts/inject-version.mjs`
- 构建流程：`npm run prebuild` → `inject-version.mjs` 读取 `../../VERSION` → 写入当前子包的 `package.json#version`
- 已接入的项目：Site、Portal、Blog（UI 不单独部署，不接入）
- 升级版本：直接改 `VERSION` 文件即可，构建时自动同步
- 注意：根 `package.json#version` 需要手动同步，它不做预构建注入

## 翻译检查豁免机制

`packages/scripts/check-translations.mjs` 的豁免机制（判定顺序短路）：

```
1. IGNORE_FALLBACK_KEYS.has(key)       → 跳过 ✅（全局，按 key 路径）
2. IGNORE_FALLBACK_VALUES.has(value)   → 跳过 ✅（全局，按英文值）
3. SHARED_WORDS_ALL.has(value)         → 跳过 ✅（全局共享词）
4. SHARED_WORDS_BY_LANG[lang].has(val) → 跳过 ✅（按语言）
5. 以上都不满足                         → 报错 ❌
```

### 选择建议

| 情况 | 机制 |
|------|------|
| 某个 key 在所有语言都不该翻译 | `IGNORE_FALLBACK_KEYS` |
| 某个英文词在所有语言都不该翻译 | `IGNORE_FALLBACK_VALUES` |
| 某个英文词仅在特定语言中合理保留 | `SHARED_WORDS_BY_LANG` |
| 吃不准 | 先加 `SHARED_WORDS_BY_LANG`，确认所有语言都需要再升到 `IGNORE_FALLBACK_VALUES` |

### 常见误区
- ❌ 误用 `IGNORE_FALLBACK_VALUES` 豁免科学术语 → 所有语言不报错，可能遗漏需翻译语言
- ✅ 正确：先用 `SHARED_WORDS_BY_LANG` 只在拉丁语言中豁免，日语/中文仍会提示

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

### 翻译注意
- blog title ≤ 55 Unicode 字符
- 48 语言不允许英文 fallback

## 用户页面设计规范

### 关键规则
1. **禁止硬编码颜色：** 使用主题 tokens（`text-primary-navy`、`bg-bg-ice`、`gold`），不用 `text-[#1B365D]`
2. **卡片样式统一：** `rounded-xl shadow-sm border-gray-200 hover:shadow-md`
3. **i18n：** Dashboard 页面用 `useTranslations('Dashboard')`，Me 系列页用 `useT('Report')`
4. **加载/未登录态：** 统一复用内联 Loading/NotLoggedIn 组件
5. **计划/状态显示：** API raw 值（monthly/active）需通过映射表转翻译 key

## translate-tool 铁律（2026-06-30）

**只调 CLI，不写 Python 脚本。**
- ❌ 禁止编写自定义 Python 脚本调用 translate-tool 的内部 API
- ❌ 禁止直接修改 translate-tool 项目代码、配置或 `pyproject.toml`
- ✅ 所有交互必须通过 `translate-tool` CLI 命令行完成
- ✅ 结果导出后手动处理 JSON merge
- ⚠️ 工具缺功能（如无内置 merge 命令）→ 如实上报，由你评估是否修复

### 语法注意
`const locale = propLocale || params?.locale ?? 'en'` 在 Turbopack 中报错。需加括号：
`propLocale || (params?.locale ?? 'en')`

### 翻译引擎
- 路径：`/root/projects/translate-tool/`（Google Translate 双渠道）
- Quota 查看：`source /root/projects/.venv/bin/activate && python scripts/translate.py quota`

### 环境变量
所有秘密变量统一在 `~/.openclaw/.env`。CF Pages 已配置：

| 变量 | 说明 |
|------|------|
| `CREEM_API_KEY` / `CREEM_WEBHOOK_SECRET` | Creem 支付 |
| `CREEM_PRODUCT_ID_SINGLE` / `CREEM_PRODUCT_ID_SUBSCRIBE` | 产品 ID |
| `RESEND_API_KEY` / `EMAIL_FROM` | 邮件 |
| `JWT_SECRET` | Portal 会话签名 |
| `NODE_VERSION=22` | CF Pages 运行时 |
