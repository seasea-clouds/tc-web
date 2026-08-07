# HISTORY.md — 历史执行记录归档

> 本文件归档已完成的阶段性任务执行记录，供日后查阅。当前任务状态见 TASK.md。

---

# 🚀 深度差异化方案 D1-D9（2026-08-04 启动，2026-08-07 全部完成）

**背景：** Token 免费期间全量执行。Portal/Admin 是工具/后台，**不差异化**；面向客户的**主站（site）+ 博客站（blog）**全部深度差异化。

**核心原则：**
1. 事实不能变：GACC 注册流程、CCC 测试项目、5 年有效期等硬事实 48 语言一致
2. 视角可以变：举例/语境/关键词/信任元素按国家差异化（延续 T4 已确立的国家视角）
3. SEO 关键词驱动：每语言嵌入本土搜索词
4. 质量优先，禁止英文 fallback

## 批次总览

| 批次 | 内容 | 范围 | 状态 |
|------|------|------|------|
| **D1** | 服务页全字段差异化 | 6 服务 × 48 语言 × ~41 字段 | ✅ 完成（2026-08-04） |
| **D2** | 行业页全字段差异化 | 10 行业 × 48 语言 × ~27 字段 | ✅ 完成（2026-08-05） |
| **D3** | ServiceCommon + Home 差异化 | 22 + 66 keys × 48 语言 | ✅ 完成（2026-08-05） |
| **D4** | FAQ 页 + 次级页差异化 | Faq(97) + About/Packages/Quote/ThankYou/Testimonials/Services/Sitemap × 48 | ✅ 完成（2026-08-05） |
| **D5** | Blog namespace + 文章标题/excerpt | Blog(61) × 48 + BlogFaq(62) × 48 + 528 文章 frontmatter | ✅ 完成（2026-08-05） |
| **D6** | 博客正文本地化增强 | 528 篇 × 核心篇本地化增强（新文章暂缓） | ✅ 完成（2026-08-06） |
| **D7** | 技术 SEO：metaTitle/metaDescription/frontmatter 精写 | 48 语言全量手动改写 | ✅ 完成（2026-08-07） |
| **D8** | IndustriesCommon.metaDescription 本地化 | 46 语言英文残留精写（en 母版 + ko 原有） | ✅ 完成（2026-08-07） |
| **D9** | 行业详情页 meta fallback bug 修复 | `[industry]/page.tsx` includes('.') → t.has() | ✅ 完成（2026-08-07） |

---

## D1-D4：基础差异化（2026-08-04 ~ 2026-08-05）

- **D1** 服务页全字段差异化：6 服务 × 48 语言 × ~41 字段
- **D2** 行业页全字段差异化：10 行业 × 48 语言 × ~27 字段
- **D3** ServiceCommon + Home 差异化：22 + 66 keys × 48 语言
- **D4** FAQ 页 + 次级页差异化：Faq(97) + About/Packages/Quote/ThankYou/Testimonials/Services/Sitemap × 48

## D5：Blog namespace + 文章标题/excerpt 差异化（2026-08-05）

- **Blog namespace**（blog 61 keys + site 37 keys 同步）全部差异化
- **BlogFaq\* 6 namespace**（62 keys）全部差异化
- **528 篇文章 title/excerpt**（48 语言 × 11 篇）全部本地视角改写
- 保护字段逐字节保留：slug/date/category/references、author=David Zhang、readTime='min'、ctaResponse 24h 语义、contactEmailPlaceholder
- 修复：cat_E_commerce 英文 fallback（it/nl/pl）、bg dash 混用（W02）、各语言 site/blog metaTitle 不同步、机翻错误（viilaus 锉刀、izpilvane 指甲锉 等）

### D5 执行日志

| 子批 | 语言 | commit | 验证 |
|------|------|--------|------|
| D5-1 | de/es/fr/it/ja | 2a42d96b | ✅ 线上验证通过（修复 it cat_E_commerce fallback） |
| D5-2 | ru/nl/pl/pt/ko | 54458c9f | ✅ 线上验证通过（修复 nl/pl cat_E_commerce fallback） |
| D5-3 | vi/tr/ar/th/uk | 7a2976a3 | ✅ 线上验证通过 |
| D5-4 | en/zh/id/ms/hi | b814e90c | ✅ 已部署（修复 id mdx frontmatter） |
| D5-5 | cs/bg/ro | 9d5b4f92 | ✅ 已部署（修复 bg dash 混用 W02） |
| D5-6 | el/hu/sr/hr/sk | bea8a5f3 | ✅ 已部署 |
| D5-7 | da/fi | 00597c75 | ✅ 线上验证通过 |
| D5-8 | af/az/sv/no | 09411940 | ✅ 线上验证通过 |

## D6：博客正文本地化增强（2026-08-05 ~ 2026-08-06）

**范围（用户确认：只做现有文章优化，新文章任务暂缓）：**
- 第一步：补全缺失正文（ja 平均 430 词 / zh 324 词 vs en 1449 词，33 篇被截断 → 补全到与 en 等长）
- 第二步：正文本地化增强（528 篇按国家视角补充本土案例/机构/搜索词）

### D6 执行日志

| 子批 | 内容 | commit | 验证 |
|------|------|--------|------|
| D6-1a | zh 补全 11 篇（段落比 100%，修复 220 处格式）+ en 3-well bug 修复 | b828bacd | ✅ 线上验证通过 |
| D6-1b | ja 补全 11 篇（字符比 55-63%，修复机翻残留） | 855e2385 | ✅ 线上验证通过 |
| D6-1c | th 确认无需补全（"552 词"为泰文分词误判） | - | ✅ 无需处理 |
| D6-2a | de/es/fr/it/ja 正文本地化增强（4 核心篇） | a6562249 | ✅（de VDE/BVL、es SENASA/INAPI、fr DGAL/INPI、it ICQRF/UIBM、ja 和牛/PSE 均命中） |
| D6-2b | ru/nl/pl/pt/ko | e438669d | ✅（ru Wildberries、nl Benelux、pl wódka、pt Alentejo、ko KIPRIS 均命中） |
| D6-2c | vi/tr/ar/th/uk | d16d6242 | ✅（vi thanh long、tr kayısı、ar التمور、th TISI、uk УкрСЕПРО 均命中） |
| D6-2d | id/ms/hi/cs/ro | 29d65355 | ✅（id kelapa、ms durian、hi मसाले、cs pivo、ro OSIM 均命中） |
| D6-2e | bg/el/hu/sr/hr | 2b7c4dee | ✅（bg розовото、el Έλληνες、hu NÉBIH、sr малина、hr kozmetike 均命中） |
| D6-2f | da/fi/sk/af/az | 65de47f4 | ✅（da smør、fi kaura、sk pivovary、af rooibostee、az AZPATENT 均命中） |
| D6-2g | sv/no/sl/sq/ca | d9bfa2cf | ✅（sv sill、no torsk、sl jabolka、sq shqiptarë、ca cava 均命中） |
| D6-2h | be/bn/fa/he/hy | c235a7d8 | ✅（be бульба、bn চিংড়ি、fa زعفران、he הפטנטים、hy Հայաստանից 均命中） |
| D6-2i | ka/ne/si/sw/ta/ur | db4e990c | ✅（ka ქართველი、ne पश्मिना、si ලාංකික、sw karafuu、ta தமிழ்நாடு、ur پاکستانی 均命中） |
| D6-2j | en 基准文增强 + zh 同步 | 78a16aff | ✅（en SRRC/RMB 26,000/GB 7718-2025 均命中） |

**关键修复：** fr "3 bien avant"→"3 à 6 mois"、es "3 veces"→"3 a 6 meses"、de "3-mal"→"3-6 Monate"（对齐 en 硬事实 3-6 个月）；ja 的"3 十分前"→"3〜6 か月前"；zh 双破折号 67 处；it ccc 弯引号回归 un'ampia（U+2019）。

## D7：技术 SEO — metaTitle/metaDescription/frontmatter 精写（2026-08-06 ~ 2026-08-07）

**问题（已全量扫描，48 语言）：**

| 项 | 位置 | 超长数（全 48 语言） |
|----|------|---------------------|
| metaTitle > 60 | site/blog messages | ~426 页 |
| metaDescription > 160 | site messages | ~383 页 |
| 文章 title > 60 | blog frontmatter | 280 个 |
| 文章 excerpt > 160 | blog frontmatter | 447 个 |

**处理原则（用户确认）：**
1. **不截断**（不用 "…" 切）
2. **不走翻译工具**（逐条人工改写，不调 t-translate）
3. 压缩冗余：删地区枚举、合并重复后缀
4. **保留核心 SEO 关键词**（GACC / CCC / NMPA / GB 7718-2025 / CNIPA / Decree 248 / SRRC）
5. title ≤ 60、desc ≤ 160，语义完整自然

**保护字段（逐字节不变）：** slug / date / category / references / author=David Zhang / readTime='min' / 硬事实数值（Decree 248/249、2022-01-01、CIFER、GB 7718-2025、17 类、5 年有效期等）
**R08：** blog 标题无冒号/破折号/连字符；frontmatter 闭合 `---` 独立成行

### D7 执行日志（8 批 47 语言，zh 已达标跳过）

| 批 | 语言 | commit | 验证 |
|----|------|--------|------|
| 批 1（en 基准） | en | ff50cdee | ✅ CI 全绿（后修复 frontmatter --- 粘连 bug，见 47fa2a71） |
| 批 2 | de/es/fr/it/ja | 47fa2a71 | ✅ 部署验证通过 |
| 批 3 | ru/ar/pt/ko/tr/vi/th | 5d2a9c09 | ✅ 部署验证通过 |
| 批 4 | id/ms/pl/nl/cs/ro/el/hu | 27fbcef9 | ✅ 部署验证通过 |
| 批 5-1 | af/az/be/bg/bn/ca/da/fa/fi | d45194e3 | ✅ 部署验证通过 |
| 批 5-2a | he/hi/hr/hy/ka/ne/no/si/sk | 7543daca | ✅ 部署验证通过 |
| 批 5-2b | sl/sq/sr/sv/sw/ta/uk/ur | 875458dc | ✅ 部署验证通过 |

**各语言改写量摘要：** de 31+2+11、es 34+2+18、fr 44+2+11、it 36+2+20、ja 1 site、ru 25+2+18、ar 9+1+12、pt 33+1+20、ko 2 site、tr 7+2+16、vi 17+2+16、th 8+2+10、id 12/2/22、ms 13/2/18、pl 22/2/18、nl 22/2/19、cs 13/2/16、ro 23/2/22、el 22/2/20、hu 17/1/15、af 12、az 13、be 13、bg 13、bn 9、ca 13、da 12、fa 9、fi 13、he 5+7、hi 5+1+10、hr 14+1+15、hy 24+2+20、ka 18+2+20、ne 8+10、no 10+1+17、si 11+1+12、sk 16+2+14、sl 17+2+17、sq 22+2+20、sr 12+1+14、sv 12+2+14、sw 20+2+15、ta 12+2+19、uk 21+2+20、ur 9+12（site + blog + frontmatter）

**顺带修复：**
- ff50cdee 遗留 bug：11 个 en mdx frontmatter 的 `---` 结束符粘连在 excerpt 行尾（Next.js 构建失败）→ 补换行修复（47fa2a71）
- nl 6 个 blog title 连字符（R08 违规，荷兰语复合词习惯如 GACC-registratie）→ 改写为空格分隔（GACC registratie、onlinehandel）
- 方向性错误修正：hr "uvoza iz Kine"→"u Kinu"、sk "dovoz z Číny"→"do Číny"、sr "iz Kine"→"u Kinu"、sl "s Kitajske"→"na Kitajsko"
- 错误译词修正：sq "KKK-së"→CCC、sw "Insightsu"→"Maarifa"、ta "பிராண்ட் பிராண்ட்" 重复
- 垃圾串清理：be Blog.metaTitle 138→54、ca 135→47、hy Blog 176→53、ka Blog 137→54、he Blog 99→54 + 零宽空格 U+200B

## D8：IndustriesCommon.metaDescription 本地化（2026-08-07）

- 背景：46 语言（非 en/ko）共用同一 151 字符英文 metaDescription，虽 ≤160 过 CI，但违反"禁止英文 fallback"品牌铁律，且影响 hreflang/CTR
- 用户选择**手动精写**方案（A 方案），拒绝机器翻译
- 4 个子代理分批（12/12/12/10 语言），每语言仅改 metaDescription 1 行（str.replace 字节级替换）
- 遗漏发现与修复：a 组任务清单把 fa 放错位置，ar 从未分配 → 父代理手动精写 ar（参照其 metaTitle + fa/he RTL 模式），123 chars
- 最终：48 语言英文残留 0 个、超长 0、本地化 47/47；commit `f8e575e4`（46 files, +46/-46）
- 结论：IndustriesCommon.metaDescription 无页面渲染引用（遗留/备用数据层字段），但完成数据层一致性，不算浪费

## D9：行业详情页 meta fallback bug 修复（2026-08-07）

- **背景**：线上验证发现 /industries/[industry] 页面 description 仍超长（de 221 / fr 201 / en 205），D7/D8 精写的行业 metaDescription 未生效
- **根因**：`apps/site/src/app/(site)/[locale]/industries/[industry]/page.tsx` 的 fallback 逻辑用 `!rawDesc.includes('.')` 判断 key 缺失——所有含句号的正常 metaDescription（410/480）被误判为缺失，fallback 到 heroSubtitle（超长）
- **修复**：改为 `t.has('metaTitle')` / `t.has('metaDescription')`（next-intl 标准 key 存在性检查）→ commit `025034c`
  - 本地 build 6529 checks 0 fail；修复前 141 个行业 desc 超长 → 修复后 0 个
- **部署插曲**：CF Pages 构建队列卡住（025034c queued 40+ 分钟，stages 全 idle）→ push 空 commit `11084022` 重新触发 → 部署成功
- **线上验证**：生产 + pages.dev 全部语言 metaDescription 生效（de 221→146 / fr 201→142 / en 205→152 / es 236→138 / uk 164→83）；10 行业 × 48 语言真实字符数全部 ≤160（fr/pet-food HTML 实体 172 为假象，解码后 157 合规）
- **遗留（不影响 meta/SEO）**：heroTitle/heroSubtitle 超长（148+79 个）仅影响页面正文 hero 区文本视觉

---

# 其他历史

- **he 零宽空格 U+200B 清理**（2026-08-07）：46 个 U+200B 垃圾字符（site 16 + blog 6 + 8 mdx 24），commit `fb47f25c`
- **NOTES/SOP 文档维护**（2026-08-07）：translate-tool → t-translate 路径/命令更新，commit `e949c118`
