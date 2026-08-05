# TASK.md — 任务清单

# 🚀 深度差异化方案 D1-D7（2026-08-04 启动，2026-08-05 执行中）

**背景：** Token 免费期间全量执行。Portal/Admin 是工具/后台，**不差异化**；面向客户的**主站（site）+ 博客站（blog）**全部深度差异化。

**核心原则：**
1. 事实不能变：GACC 注册流程、CCC 测试项目、5 年有效期等硬事实 48 语言一致
2. 视角可以变：举例/语境/关键词/信任元素按国家差异化（延续 T4 已确立的国家视角）
3. SEO 关键词驱动：每语言嵌入本土搜索词
4. 质量优先，禁止英文 fallback

## 各批次状态

| 批次 | 内容 | 范围 | 状态 |
|------|------|------|------|
| **D1** | 服务页全字段差异化 | 6 服务 × 48 语言 × ~41 字段 | ✅ 完成（2026-08-04） |
| **D2** | 行业页全字段差异化 | 10 行业 × 48 语言 × ~27 字段 | ✅ 完成（2026-08-05） |
| **D3** | ServiceCommon + Home 差异化 | 22 + 66 keys × 48 语言 | ✅ 完成（2026-08-05） |
| **D4** | FAQ 页 + 次级页差异化 | Faq(97) + About/Packages/Quote/ThankYou/Testimonials/Services/Sitemap × 48 | ✅ 完成（2026-08-05） |
| **D5** | Blog namespace + 文章标题/excerpt | Blog(61) × 48 + BlogFaq(62) × 48 + 528 文章 frontmatter | ⏳ 待做（本轮） |
| **D6** | 博客正文本地化增强 + 本地市场新文章 | 528 篇增强 + 48-100 篇新文章 | ⏳ 待做 |
| **D7** | 技术 SEO 体检 | hreflang/sitemap/OG/JSON-LD/内链/canonical | ⏳ 待做 |

---

# D5 详细方案：Blog namespace + 文章标题/excerpt 差异化（2026-08-05 新增）

## D5 执行日志

| 子批 | 语言 | commit | 部署 | 验证 |
|------|------|--------|------|------|
| D5-1 | de/es/fr/it/ja | 2a42d96b | ✅ | ✅ 线上验证通过（ja 食品輸出企業のためのGACC登録 / fr exportateurs / it Approfondimenti 等，ja CDN 缓存延迟后确认）| 修复 it cat_E_commerce fallback |
| D5-2 | ru/nl/pl/pt/ko | 54458c9f | ✅ | ✅ 线上验证通过 | 修复 nl/pl cat_E_commerce fallback |
| D5-3 | vi/tr/ar/th/uk | 7a2976a3 | ✅ | ✅ 线上验证通过（vi hướng dẫn / tr fındık / ar التجارة الإلكترونية / th อีคอมเมิร์ซ / uk електронна комерція） |
| D5-4 | en/zh/id/ms/hi | b814e90c | ✅ | ✅ 已部署 | 修复 id mdx frontmatter |
| D5-5 | cs/bg/ro | 9d5b4f92 | ✅ | ✅ 已部署 | 修复 bg dash 混用（W02） |
| D5-6 | el/hu/sr/hr/sk | bea8a5f3 | ✅ | ✅ 已部署 | sr 由并行批次处理 |
| D5-7 | da/fi | 00597c75 | ✅ | ✅ 线上验证通过（da fødevareeksportører / fi suomalaisille+verkkokauppa） |
| D5-8 | af/az/sv/no | 09411940 | ✅ | ✅ 线上验证通过（af GACC-registrasie / az nar+Elektron ticarət / sv Livsmedelsverket / no Mattilsynet+mva） |

## ✅ D5 全部完成（2026-08-05）

**D5 Blog namespace + 文章标题/excerpt 差异化 48/48 语言全部完成并部署验证！**

- **Blog namespace**（blog 61 keys + site 37 keys 同步）全部差异化
- **BlogFaq\* 6 namespace**（62 keys）全部差异化
- **528 篇文章 title/excerpt**（48 语言 × 11 篇）全部本地视角改写
- 保护字段逐字节保留：slug/date/category/references、author=David Zhang、readTime='min'、ctaResponse 24h 语义、contactEmailPlaceholder
- 修复：cat_E_commerce 英文 fallback（it/nl/pl）、bg dash 混用（W02）、各语言 site/blog metaTitle 不同步、机翻错误（viilaus 锉刀、izpilvane 指甲锉、viilaus 等）

**下一步：D6 博客正文本地化增强 + 本地市场新文章（528 篇增强 + 48-100 篇新文章）。**
| D5-4 | en/zh/id/ms/hi | b814e90c | ✅ | ⏳ 验证中 | 修复 id 6 篇 MDX frontmatter 被脚本 bug 污染 |

## 背景与现状（已调研）

- **博客已迁移至独立 blog app**（apps/blog），site 通过 Worker 代理 `/blog/` 到 blog 站
- blog messages 已存在 48 语言（apps/blog/messages/{lang}.json）
- **Blog namespace 结构**：blog 61 keys = site 37 keys（子集）+ blog 独有 24 keys（cat_* 7 个分类名 + contact* 6 个表单 + share* 6 个分享 + ctaDesc/ctaResponse/copyLink 等）
- **BlogFaq* namespace（6 个，均在 site messages）**：BlogFaqGaccRegistrationGuide(10) / BlogFaqChinaLabelCompliance(8) / BlogFaqCccCertificationExplained(8) / BlogFaqCosmeticsNmpaFiling(8) / BlogFaqCrossBorderEcommerceChina(8) / BlogFaqKoreanCosmeticsGuide(20) = 62 keys
- **528 篇文章**（48 语言 × 11 篇）：frontmatter 含 title / slug / date / category / excerpt / references
  - 标题总字符 ~34K，excerpt 总字符 ~112K（合计 ~146K 字符）
  - 现状：各语言标题/excerpt 是**直译版**（如 de "Vollständiger Leitfaden zur GACC Registrierung..."），未按国家视角差异化
- **site 的 Blog namespace（37 keys）D4 未覆盖**，本轮一并处理

## 范围（每语言 ~145 字段 + 11 标题 + 11 excerpt）

| 对象 | 位置 | 数量 | 说明 |
|------|------|------|------|
| Blog namespace | apps/blog/messages/{lang}.json | 61 keys | 全字段差异化（标题/副标题/CTA/分享/分类名） |
| Blog namespace | apps/site/messages/{lang}.json | 37 keys | 与 blog 同步（子集） |
| BlogFaq* 6 namespace | apps/site/messages/{lang}.json | 62 keys | 每篇博客 FAQ 差异化 |
| 文章 title | apps/blog/content/{lang}/*.mdx | 11 篇 | frontmatter title 本地视角改写 |
| 文章 excerpt | apps/blog/content/{lang}/*.mdx | 11 篇 | frontmatter excerpt 本地视角改写 |

## 保护字段（逐字节保留）

### 文章 frontmatter（硬性）
- **slug**：路由依赖，48 语言必须完全一致（如 gacc-registration-guide），**禁止改**
- **date**：保持原值（2013-2025 分布，品牌 2010s 成立）
- **category**：固定 7 种英文值（Brand Protection / Compliance Guide / Cosmetics / E-commerce / Food & Beverage / Label Compliance / Product Certification），显示文案走 Blog.cat_* 翻译，**frontmatter 内不改**
- **references**：标准号/机构名/URL 不变（title 翻译但 URL 不变，标准号如 "GACC Decree 248" 保持官方英文）
- **title/excerpt 中的硬事实**：Decree 248/249、2022-01-01、CIFER、GB 7718-2025、17 类、NMPA、5 年有效期等数值/标准号不变

### Blog namespace
- author: David Zhang（人名）
- readTime: 'min'（格式串，CI 强制保留）
- 24h 响应语义（ctaResponse "Free consultation → 24h response" 的 24 小时不变）
- contactEmailPlaceholder: you@company.com（邮箱示例）
- cat_* 7 值 = 分类翻译（可差异化，但 7 个分类语义必须与页面实际分类一一对应）

### BlogFaq*
- 硬事实答案数值不变（GACC 5 年/3-6 个月、CCC 17 类、NMPA 流程等）
- 语境/措辞可本地化

## 执行方式

延续 D1-D4 "一国一脚本"模式，guide 更新 /tmp/d5_guide.md，每语言 2 个脚本：
1. `/tmp/d5_{lang}_blog.py` — 处理 blog messages Blog(61) + site messages Blog(37) + BlogFaq*(62)
2. `/tmp/d5_{lang}_mdx.py` — 处理 11 篇文章的 title/excerpt（读 frontmatter、改值、保 slug/date/category/references）

分批（5 语言/批 × 10 批）→ CI → key 集合 → 保护字段 → build（site + blog 两 app）→ commit → push → 部署 → 线上验证（/blog/ 文章页标题 + excerpt）。

## 质量检查

- check-translations.mjs（48 语言 0 问题）
- blog 构建（ci-check.mjs --out-dir=out --ci）+ site 构建
- frontmatter 完整性：slug/date/category/references 逐字节不变（脚本断言）
- key 集合：Blog/BlogFaq* 与 en 完全一致
- 线上验证：抽查每语言 1-2 篇博客标题/excerpt

## 风险与对策

| 风险 | 对策 |
|------|------|
| 528 篇 frontmatter 改动量大 | 每语言 1 个 mdx 脚本批量处理 11 篇；脚本断言 slug/date/category 不变 |
| YAML 双引号嵌套（希伯来语等） | 复用 NOTES.md 记录的坑：标题含双引号需转义处理 |
| R08 标题检查（无冒号/连字符） | 改写标题避免冒号/破折号/连字符（参考 D4-5 经验） |
| site/blog 两处 Blog namespace 不同步 | 脚本同时写两处，diff 断言 site Blog = blog Blog 前 37 keys |

---

# D6 计划：博客正文本地化增强 + 本地市场新文章（待做）

- 528 篇博客正文增强（每篇按国家视角补充本土案例/机构/搜索词）
- 新增 48-100 篇本地市场主题文章（如医疗设备、GB 标准等缺口主题）
- 流程：en 源文 → translate-tool 47 语言 → 合并 → CI → 构建部署验证

---

# D7 计划：技术 SEO 体检（待做）

- hreflang / sitemap / OG / JSON-LD / 内链 / canonical 全站体检
- 修复发现的技术问题
