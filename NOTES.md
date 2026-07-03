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

## P3b — check-t-keys.mjs 动态 key 验证（2026-07-03）

`check-t-keys.mjs` 原仅检查静态 `t("key")` 调用。P3b 扩展后额外验证 **模板字面量** `t(\`prefix_${var}\`)` 模式。

### 设计原理

1. **静态前缀匹配**: 解析 `t(\`...\`)` 成 static segments + `${var}` 占位符
2. **已知值来源展开**: 对以下模式做完整组合验证：
   - `comp${prefix}` (+China/EU/US) → COMPARISON_FIELDS 交叉验证（10 × 4 = 40 keys）
   - `step${i}Title/Desc` → [1,2,3] 展开（6 keys）
   - `catCcc_${v}`, `catNmpa_${v}` 等 → 从 modules/*/rules.ts 动态加载 CATEGORY_LABELS
   - `gaccCat_${cat}_label` / `gaccCat_${cat}_riskReason` → 同上
   - `cccCat_${cat}_label`, `nmpaCat_${cat}_label` → 同上
3. **多变量跳过**: 2+ 动态变量的模式（如 `cccProfile_${cat}_test_${idx}`）暂不展开
4. **非翻译模式过滤**: 文件路径、字符串拼接、URL 等 false positive 自动跳过

### CATEGORY_LABELS 自动加载

脚本扫描 `apps/portal/modules/*/rules.ts` 中的 `CATEGORY_LABELS` 定义（支持带引号和不带引号的 key），自动关联到对应前缀：

| 模块 | 前缀 |
|------|------|
| gacc | catGacc_, gaccCat_ |
| ccc | catCcc_, cccCat_ |
| nmpa | catNmpa_, nmpaCat_ |
| label | catLabel_ |
| crossborder | catCb_ |
| trademark | catTm_ |

新增品类时只需在 rules.ts 中添加 CATEGORY_LABELS 条目，脚本自动识别验证。

### 翻译铁律

禁止翻译词表（NO_TRANSLATE）

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

### 语法注意
`const locale = propLocale || params?.locale ?? 'en'` 在 Turbopack 中报错。需加括号：
`propLocale || (params?.locale ?? 'en')`

### 翻译引擎
- 路径：`/root/projects/translate-tool/`（Google Translate 双渠道）
- Quota 查看：`source /root/projects/.venv/bin/activate && python scripts/translate.py quota`

## ⚠️ Portal Cloudflare Functions Worker 大小限制（2026-07-02）

**问题：** Portal 的 23 个 CF Pages Functions API 端点打包后超过 Free Plan 的 **3 MiB Worker 限制**，wrangler CLI 部署失败。

**影响：** 静态 SSG 页面可正常部署（`mv functions functions.bak && wrangler pages deploy`），但 API 端点（`/api/auth/*`、`/api/report/*`、`/api/payment/*` 等）不可用。

**解决方案（当前）：** 依赖 **GitHub auto-build** 进行 Portal 部署。推送到 `main` 后 CF Pages 自动从 GitHub 构建，能通过 Worker 大小限制。

**临时修复方法（如误用无 Functions 部署覆盖了生产）：**
```bash
# 1. 找到 GitHub auto-build 的成功部署（无 "Failure" 标签）
npx wrangler pages deployment list --project-name=trade-web-portal | grep -v "Failure"

# 2. 通过 CF API 回滚
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/f4c6ce66c3dd07c11547fd610c4bb891/pages/projects/trade-web-portal/deployments/{DEPLOYMENT_ID}/rollback" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
```

**长期方案：** 升级 CF Pro Plan（$5/月，10 MiB Worker limit），或精简 Functions 依赖。

### 环境变量
所有秘密变量统一在 `~/.openclaw/.env`。CF Pages 已配置：

| 变量 | 说明 |
|------|------|
| `CREEM_API_KEY` / `CREEM_WEBHOOK_SECRET` | Creem 支付 |
| `CREEM_PRODUCT_ID_SINGLE` / `CREEM_PRODUCT_ID_SUBSCRIBE` | 产品 ID |
| `RESEND_API_KEY` / `EMAIL_FROM` | 邮件 |
| `JWT_SECRET` | Portal 会话签名 |
| `NODE_VERSION=22` | CF Pages 运行时 |
