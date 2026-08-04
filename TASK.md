# TASK.md — 任务清单

# GSC 数据分析任务（2026-08-03）— 待用户逐个确认处理

**数据来源：** Google Search Console 导出 10 个文件（Coverage 总览 ×1 + Drilldown ×7 有效 + Performance ×1），范围 2026-05-22 ~ 07-24
**完整报告：** /tmp/gsc_analysis/GSC_综合报告_20260803.md

## 站点现状

- 收录：已编入 1,300 / 未编入 1,231 / **收录率 51.4%**（5 月 67.1%，持续下滑）
- 流量：3 个月 9 次点击 / 1,914 展示，**7 月 0 点击**，CTR 0.47%
- 73% 关键词排名在 51-100（163/223 个）

## 全关键词盘点（223 个有展示词，总展示 1276）

### 三大主题（占全部展示）

| 主题 | 词数 | 展示 | 语言分布 | 目标页面 |
|------|------|------|---------|---------|
| **CCC 认证** | 95 | **701 (55%)** | de 421 / en 261 / ja 15 / ru 3 / pl 1 | /services/ccc/ + 博客 ccc-certification-explained |
| **商标/品牌** | 86 | **326 (26%)** | de 142 / en 141 / ru 17 / es 10 / ja 10 / he 3 / fr 1 | /services/brand/ + 博客 china-trademark-registration |
| **进口/跨境电商** | 42 | **249 (19%)** | en 234 / de 9 / ru 4 / fr 1 / es 1 | /services/gacc/ /services/ecommerce/ + 博客 gacc-registration-guide / cross-border-ecommerce-china |

### CCC 认证关键词 TOP（701 展示）

| 关键词 | 展示 | 排名 | 语言 |
|--------|------|------|------|
| ccc zertifizierung | 154 | 71.67 | de |
| ccc zertifikat | 139 | 74.45 | de |
| ccc mark requirements | 24 | 86.75 | en |
| ccc china | 16 | 70.75 | en |
| ccc zertifikat china | 15 | 73.53 | de |
| ccc certificaat china aanvragen | 15 | 84.93 | nl |
| ccc certification | 12 | 81.33 | en |
| ccc-zertifikat | 11 | 69.64 | de |
| ccc 認証 取得 | 11 | 75.27 | ja |
| ccc standard | 11 | 82.55 | en |
| zertifizierung china | 10 | 70.9 | de |
| ccc kennzeichen / kennzeichnung / zeichen | 17 | 75-83 | de |
| ccc zertifizierung kosten | 3 | 70.67 | de |
| gacc lebensmittel registrierung | 6 | **14** | de |
| gacc lebensmittel zertifizierung | 5 | **19.8** | de |
| ccc маркировка | 2 | **11.5** | ru |
| трансграничная платформа | 2 | **12** | ru |
| gacc que es | 2 | **4.5** | es |
| norma ccc | 1 | **1** | es |
| powerbank ccc | 1 | **2** | en |
| ccc | 1 | **5** | en |
| cbec | 1 | **3** | en |
| сертификат ccc | 1 | **10** | ru |
| gb 28050-2025 / gb 7718-2025 / gb28050 | 3 | 6-40 | en |

### 商标/品牌关键词 TOP（326 展示）

| 关键词 | 展示 | 排名 | 语言 |
|--------|------|------|------|
| markenschutz china | 54 | 67.06 | de |
| markenrecht china | 33 | 75.64 | de |
| proteccion de marca en alibaba | 12 | 18.08 | es |
| markenschutz in china | 9 | 39 | de |
| enregistrer une marque en chine | 5 | 28.2 | fr |
| registrar marca en china | 5 | 86.8 | es |
| registro de marca en china | 4 | 84.75 | es |
| china trademark registration | 1 | 25 | en |
| brand protection in china | 1 | 28 | en |
| регистрация товарного знака в китае | 1 | 51 | ru |
| реєстрація товарного знака (uk) | 1 | - | uk |

### 进口/跨境电商关键词 TOP（249 展示）

| 关键词 | 展示 | 排名 | 语言 |
|--------|------|------|------|
| import-export componenti elettronici | 47 | 89.72 | it |
| regulatorische anforderungen chinesischer e commerce | 25+25 | 23-32 | de |
| gacc | 23 | 37.87 | en |
| "cross-border e-commerce" china customs gacc updates | 15 | **7.67** | en |
| import license for medical devices in china | 15 | 85.67 | en |
| food supplements registration in china | 13 | 48.62 | en |
| pet food registration | 11 | 53.55 | en |
| gacc china / gacc registration / gacc filing / gacc certification | 28 | 72-81 | en |
| elektronica certificeringsadvies | 16 | 35.81 | nl |
| importvergunning china | 8 | 84.5 | nl |

### 其他值得关注
- 已排名 < 10 的词（保持 + 确认可点击）：norma ccc(1)、powerbank ccc(2)、cbec(3)、gacc que es(4.5)、ccc(5)、gb 28050-2025(6)
- 排名 11-30 的词（轻优化即可突破）：ccc маркировка(11.5)、трансграничная платформа(12)、gacc lebensmittel registrierung(14)、gacc lebensmittel zertifizierung(19.8)、proteccion de marca en alibaba(18)、中国 健康食品 規制(21.7)、regulatorische anforderungen(23-32)、china trademark registration(25)、enregistrer une marque(28.2)
- 长尾机会：ccc zertifizierung kosten(70.67)、wat kost een medische certificering(90.43)、jak wyrobić certyfikat w chinach(16.75)

## 现有 FAQ/页面规范（已核查，优化必须遵循）

### 服务页 FAQ 规范
- 每个 Service namespace 固定 **6 条 FAQ**（faq1q/faq1a … faq6q/faq6a），ServiceFAQ 组件自动渲染（循环 1-10 遇缺即停）
- 服务页：ServiceCcc / ServiceGacc / ServiceLabel / ServiceCosmetics / ServiceEcommerce / ServiceBrand，**所有 48 语言各 6 条**
- FAQ 展示为 <details> 折叠，底部带 "Learn More → 服务名" 链接
- 页面结构固定：Hero → QuickAnswer（💡框）→ CoverSection → ProcessSteps → ServiceFAQ → RelatedResources（空桩）→ PortalCTASection → ContactForm → CTASection
- 含结构化数据：HowTo JSON-LD + DefinitionSchema + Service JSON-LD
- 文案在 messages/{lang}.json 的 Service* namespace

### 博客规范
- frontmatter：title/slug/date/category/excerpt/references（slug 一致，date 2013-2025 分布）
- 分类固定 7 种：Brand Protection / Compliance Guide / Cosmetics / E-commerce / Food & Beverage / Label Compliance / Product Certification
- 10 篇文章，48 语言全量（en 为源文）
- 博客已迁移至独立 blog app，site 的 RelatedResources 是空桩（无自动内链）

### 内链现状
- 服务页 → 博客：RelatedResources 空桩，无自动链接
- 博客 → 服务页：文章末尾 CTA 链接到 /{locale}/packages/
- 页面底部 CTA → /{locale}/packages/（R11 检查）

---

## 问题 1：搜索流量趋零（最严重）

- 3 个月仅 9 次点击，7 月 0 点击（530 展示全浪费）
- 9 次点击全部来自排名 < 9 的页面（fa/fr 博客）
- **德语展示 854 次（45%）但 0 点击**：ccc zertifizierung（154 展示，排名 71.67）、ccc zertifikat（139 展示，排名 74.45）排第 7 页后
- 73% 关键词排名 51-100，用户根本看不到

**解决方案（三个方案，已确认）：**

### 方案 1：德语 CCC 关键词攻坚（目标排名 71 → 前 20）

**状态：** ✅ 已完成（2026-08-03）
- ✅ 步骤 1：heroTitle 已含 "China"（"CCC-Zertifizierung für China"，此前已有）
- ✅ 步骤 2：heroSubtitle 融入 "China Compulsory Certification" 全称
- ✅ 步骤 3：faq3q 改为 "Wie beantrage ich ein CCC-Zertifikat für China und wie lange dauert es?"（覆盖 beantragen 长尾，与已有 kosten/pflicht 互补），faq3a 同步更新（申请流程 + 3-6 个月）
- ✅ 步骤 4：coverItems3 融入 "CCC-Zeichen"（已有 CCC-Verzeichnis + CNCA）
- ✅ 步骤 5：RelatedResources 组件自动拉取同分类博客（无需改）
- ✅ 步骤 6：de 博客 ccc-certification-explained 已含 13 处关键词，标题已过 R08
- ✅ 步骤 7：构建 + 部署（73b788cc）+ 线上验证（heroSubtitle/faq3q/faq3a/coverItems3 全部新值已上线）

**背景数据：**
- `ccc zertifizierung`：154 展示，排名 71.67
- `ccc zertifikat`：139 展示，排名 74.45
- 合计 293+ 展示（占德语 45% 展示的大头），全部 0 点击
- 德语 CCC 相关词还有：ccc mark requirements（24，排名 86.75）、ccc china（16，70.75）、ccc zertifikat china（15，73.53）、ccc certification（12，81.33）等

**德语 CCC 页面现状（已核查）：**
- 路径：apps/site/src/app/(site)/[locale]/services/ccc/page.tsx
- 文案来源：messages/de.json 的 ServiceCcc namespace
- heroTitle: "CCC-Zertifizierung"（缺 "China" 关键词）
- metaTitle: "China CCC-Zertifizierung | Leitfaden zur obligatorischen Produktzertifizierung"（已含关键词）
- 结构：Hero / QuickAnswer / CoverSection / ProcessSteps / ServiceFAQ（6 条）/ RelatedResources / PortalCTASection / ContactForm / CTASection
- 含 HowTo JSON-LD + DefinitionSchema + Service JSON-LD（结构化数据已有）

**执行步骤：**
1. 优化 de.json ServiceCcc heroTitle → 含 "China" 和 "Zertifizierung" 完整关键词（如 "CCC-Zertifizierung für China"）
2. heroSubtitle 自然融入 "China Compulsory Certification" 全称
3. FAQ 增加 1-2 条长尾词问题（覆盖 ccc zertifikat kaufen、ccc zertifizierung kosten、ccc zertifikat beantragen 等德语搜索习惯）
4. coverItems 中融入关键词变体（CCC-Zeichen、CCC-Katalog、CNCA 等）
5. 检查 RelatedResources 是否链接 de/blog/ccc-certification-explained（内链权重传递）
6. 若博客有 de 版 ccc-certification-explained，其标题/正文同步优化
7. 构建 + 部署 + 验证

**预期：** 293 展示 + 新长尾词覆盖 → 德语 CCC 词进入前 20 → 从 0 点击到日均 2-5 点击

---

### 方案 1b：英语 CCC + 商标攻坚（P2，~200 展示）

**状态：** ✅ 已完成（2026-08-03）

**核查结论：**
- de 商标部分**已达标**（heroTitle="Markenschutz in China" 精确命中 markenschutz china 54；heroSubtitle 含 "Markenrecht" 命中 markenrecht china 33；metaTitle 含 Markenregistrierung + Markenschutz；FAQ 6 条全覆盖；de 博客 CTA 已指向 /de/packages/）→ 无需改动
- en CCC 部分有缺口：heroSubtitle 缺 "mark requirements"（英语最大词 24 展示）；FAQ 无专门问题；en 博客 0 处 "mark requirement"

**执行（en 方向，4 处）：**
1. en.json ServiceCcc.heroSubtitle → 融入 "mark requirements" + "entering the Chinese market"
2. en.json ServiceCcc.faq2q → "What are the CCC mark requirements for my product?"（faq2a 目录评估答案完美匹配）
3. en 博客 ccc-certification-explained 标题 → "CCC Mark Requirements in China What Foreign Brands Need to Know"（无冒号/破折号/连字符，过 R08）
4. en 博客正文第一段 → "mark requirements define China's mandatory safety certification system..."

**验证：** site 构建 25s 通过 + blog 构建通过 + 部署（site f9430c28 / blog 806461e5）+ 线上 heroSubtitle/faq2q/标题/正文全部生效（commit 7d29b8cc）

---

### 方案 2：复制 fa/fr 博客成功模式到大流量语言

**背景数据：**
- fa/blog/gacc-registration-guide 排名 2.82（5 点击）
- fr/blog/gacc-registration-guide 排名 6.83（1 点击）
- 全部 9 次点击来自排名 < 9 的博客页面——博客内容有排名潜力
- 但德语（854 展示）英语（347 展示）等大流量语言博客未排上去

**执行步骤：**
1. 分析 fa/fr gacc-registration-guide 成功因素（标题格式、结构、内链、更新日期）
2. 检查 de/en 版 gacc-registration-guide 的现状（标题、内容、内链）
3. de/en 版标题/正文对齐 fa/fr 成功版本（保留本地化语言）
4. 检查各语言博客文章之间的内链 + 博客 → 服务页内链
5. 把同模式扩展到其他已有排名的主题（health-supplements 排名 25-48、cross-border-ecommerce 排名 23-32）
6. 构建 + 部署 + 验证

**预期：** 让 de/en 大流量语言的博客文章进入前 10 → 展示转化为点击

---

### 方案 3：微调已接近首页的关键词

**背景数据：**
- `"cross-border e-commerce" china customs gacc updates latest`：排名 7.67（已首页）
- `regulatorische anforderungen chinesischer e-commerce`：排名 23.04/32.52（第 2-3 页）
- `nahrungsergänzungsmittel export china`：排名 24.82（第 3 页）
- `proteccion de marca en alibaba`：排名 18.08（第 2 页）
- `elektronica certificeringsadvies`：排名 35.81

**执行步骤：**
1. 对排名 8-30 的关键词逐个映射到对应页面（博客/服务页）
2. 每个页面做轻量优化：标题微调、正文关键词自然融入、内链补充
3. 已首页的关键词（排名 < 10）保持不动，确认页面可点击性（标题吸引力、metaDescription）
4. 构建 + 部署 + 验证

**预期：** 把排名 8-30 的词推进前 10，每个词带来稳定点击

---

## 问题 2：收录率下滑（1,231 页未编入）

- 6 月页面总量暴增（1,086 → 2,531，48 语言扩展），新增页 60% 未被编入
- 850 个"已发现未编入" + 37 个"已抓取未编入"
- 页面均存在（200），Google 质量判断不编入（低流量语言 + 模板化页面）

**解决方案：**
1. ~~低流量语言（af/sq/ur/ne 等约 300+ 页）评估 noindex，释放抓取预算~~
2. 聚焦资源到有搜索需求的语言（de/fa/fr/en/es）
3. 优化模板化页面内容差异化（标题/正文）

**✅ 已决定（2026-08-03）：所有 noindex 方案全部取消，不再考虑。**
保留已上线的隐私页面 noindex（portal login/register + site thank-you，这是正常 SEO 做法，与低流量语言方案无关）。
收录率下滑问题后续通过内容差异化 + 聚焦高需求语言解决，不做 noindex 处理。

**✅ 内容差异化试点（2026-08-03，commit e75b63d7 已部署）**
- 方案文档：DIFFERENTIATION_PILOT.md
- 试点 1 🇩🇪 de ServiceCcc：德国出口商视角（CE vs CCC 对比、远程申请、metaTitle 本地化）
- 试点 2 🇯🇵 ja ServiceCcc：日本制造商视角（日本からの申請、PSE 制度对比）
- 试点 3 🇪🇸 es ServiceGacc：拉美食品出口商视角（Decreto 248 对拉美影响）
- CI 可行性确认：check-i18n-coverage 只查 key 覆盖率（不查内容一致），差异化只改值不增删 key 即可
- 技术细节：ja 的 PSE 术语加入 SHARED_WORDS_BY_LANG 精确豁免（日文真实术语）
- 验证：6529 SEO 检查通过、翻译质量 0 问题、i18n coverage 100%、线上 HTML 已确认
- ⏳ 观察期：2-4 周后 GSC 复查收录率/排名，对比试点 vs 未试点语言（fr/it 作对照）

**🚀 全量内容差异化改造（2026-08-03 进行中）**
- 方案文档：DIFFERENTIATION_FULL_PLAN.md
- 规模：48 语言 × 16 namespace（6 服务页 + 10 行业页）= 768 页面组合
- 分层：T1（de/en）→ T2（es/it/ja/fa）→ T3（fr/ru/nl/pl/pt）→ T4（37 低流量语言轻量）
- 方法：每语言定义本地视角（德国出口商/日本制造商/拉美出口商…），AI 直接生成本地化内容而非翻译
- ✅ **批 1 完成（commit d77745bc 已部署）**：de/en × 16 namespace = 32 页面组合
  - de：德国出口商视角（GACC食品/标签/化妆品/跨境电商/品牌 + 10 行业页）
  - en：英语母语出口商视角（US/UK/AU/NZ）
  - 附带修复：id/ms 'formula' 借词误报（SHARED_WORDS_BY_LANG 精确豁免）
  - 验证：CI 全通过 / 构建成功 / 线上 de+en 服务页+行业页 h1 全部确认
- ✅ **批 2 完成（commit 31610c29 已部署）**：es + it + ja + fa × 16 namespace = 64 页面组合
  - es：拉美出口商视角（15 namespace，GACC 试点保留；智利/阿根廷葡萄酒 FTA 角度）
  - it：意大利制造商视角（全部 16：Parmigiano、Chianti、Made in Italy）
  - ja：日本制造商视角（15 namespace，CCC 试点保留；Jビューティー、先願主義）
  - fa：伊朗出口商视角（全部 16：زعفران 藏红花、پسته 开心果、خرما 椰枣）
  - 每页：heroTitle/Subtitle + metaTitle/Description + 6 FAQ + coverItems + howtoTitle
  - 豁免：ja(WTO/Amazon)、fa(Amazon) 精确豁免；ja 用 Jビューティー 替代 J-beauty（更地道）
  - 验证：48 语言翻译质量 0 问题 / CI 全通过 / 线上 4 语言服务页+行业页 h1 全部确认
- ✅ **批 3 完成（commit 5ab3b328 已部署）**：fr + ru + nl + pl + pt × 16 namespace = 80 页面组合
  - fr：法语区出口商视角（全部 16：波尔多/勃艮第/香槟葡萄酒、奶酪、法式美妆、奢侈品防伪）
  - ru：俄罗斯/中亚视角（全部 16：EAC vs CCC 对比、中俄贸易通道、肉/奶/伏特加）
  - nl：荷兰出口商视角（全部 16：Gouda/Edam、婴儿配方奶粉、宠物食品、鹿特丹通道）
  - pl：波兰/东欧视角（全部 16：乳制品、肉类、苹果、伏特加、糖果）
  - pt：巴西/葡语区视角（全部 16：牛肉/禽肉、咖啡、INMETRO vs CCC 对比）
  - 每页：heroTitle/Subtitle + metaTitle/Description + 6 FAQ + coverItems
  - 豁免：ru(EAC/Taobao/MARA) 精确豁免
  - 验证：48 语言翻译质量 0 问题 / CI 全通过 / 线上 5 语言服务页+行业页 h1 全部确认（nl 首查遇 CDN 缓存，加参数后正常）
- ⏳ **批 4（T4）**：其余 37 语言轻量差异化（heroTitle/Subtitle + metaTitle 本地视角，保持 FAQ 翻译）
  - ✅ **T4-1 完成（commit 9d0b11d0 已部署）**：ko/zh/ar/tr/vi/th × 16 namespace = 96 页面组合
    - ko：韩国视角（K-뷰티、电子、泡菜/红参）；zh：海外华商视角；ar：海湾视角（椰枣、清真、G-Mark vs CCC）
    - tr：土耳其视角（榛子、白电、TSE vs CCC）；vi：越南视角（海鲜、咖啡、热带水果）；th：泰国视角（榴莲、大米、TISI vs CCC）
    - 豁免：th(TISI) 精确豁免
    - 验证：48 语言翻译质量 0 问题 / CI 全通过 / 线上 6 语言 ccc+gacc+dairy+skincare h1 全部确认
  - ✅ **T4-2 完成（commit 065a4804 已部署）**：id/ms/hi/he/sv/no/da/fi × 16 namespace = 128 页面组合
    - id：印尼视角（棕榈油、香料、SNI vs CCC）；ms：马来视角（棕榈油、清真、SIRIM vs CCC）
    - hi：印度视角（香料、茶、BIS vs CCC）；he：以色列视角（医疗科技、椰枣、高科技）
    - sv/no/da/fi：北欧视角（三文鱼、乳制品、设计、CE vs CCC）
    - 豁免：hi(BIS) 精确豁免
    - 验证：48 语言翻译质量 0 问题 / CI 全通过 / 线上 8 语言 ccc+dairy+skincare h1 全部确认
  - ⏳ **T4-3**：cs/hu/ro/uk/el/bg/sr/hr/sk/sl（10 语言）
  - ✅ **T4-3 完成（commit 2949a137 已部署）**：cs/hu/ro/uk/el/bg/sr/hr/sk/sl × 16 namespace = 160 页面组合
    - cs：捷克视角（皮尔森、水晶、Škoda）；hu：匈牙利视角（辣椒粉、鹅肝、托卡伊）
    - ro：罗马尼亚视角（葡萄酒、蜂蜜）；uk：乌克兰视角（谷物、葵花籽油、蜂蜜）
    - el：希腊视角（橄榄油、羊乳酪）；bg：保加利亚视角（玫瑰油、酸奶）
    - sr：塞尔维亚视角（树莓、šljivovica，**西里尔文**）；hr：克罗地亚视角（橄榄油、海产）
    - sk：斯洛伐克视角；sl：斯洛文尼亚视角（葡萄酒、蜂蜜）
    - 验证：48 语言翻译质量 0 问题 / CI 全通过 / 线上 cs 部署确认
  - ✅ **T4-4 完成（commit 7933e564 部署中）**：af/az/be/bn/ca/hy/ka/ne/si/sq/sw/ta/ur × 16 namespace = 208 页面组合
    - af：南非视角（葡萄酒、柑橘、SABS vs CCC）；az：阿塞拜疆视角（石榴、茶）
    - be：白俄罗斯视角（**西里尔文**）；bn：孟加拉视角（茶、虾、黄麻，**孟加拉字母**）
    - ca：加泰罗尼亚视角（cava、橄榄油）；hy：亚美尼亚视角（白兰地，**亚美尼亚字母**）
    - ka：格鲁吉亚视角（qvevri 葡萄酒，**格鲁吉亚字母**）；ne：尼泊尔视角（茶、地毯，**天城文**）
    - si：僧伽罗视角（锡兰茶、肉桂，**僧伽罗字母**）；sq：阿尔巴尼亚视角（橄榄油、蜂蜜）
    - sw：坦桑尼亚视角（茶、咖啡、腰果）；ta：泰米尔视角（茶、香料，**泰米尔字母**）
    - ur：巴基斯坦视角（纺织品、皮革，**乌尔都字母**）
    - 注意：实际 48 语言无 et/lv/lt/mk，T4-4 为 13 语言
    - 验证：48 语言翻译质量 0 问题 / CI 全通过 / 线上验证中

---

## 问题 3：404 历史遗留（57 个 URL）

### 3a. 幽灵博客文章 404（20 个）
- 18 个日语 ja + ar + bg 各 1（metaverse-virtual-goods-trademark-protection、blockchain-anti-counterfeiting-supply-chain、circular-economy-ecommerce-packaging-recycling 等）
- git 全历史从未存在，AI 批量生成 SEO slug，站内无引用
- **方案：** GSC 标记已修复/忽略

### 3b. compli-service 旧路径 404（8 个）
- /nl/compli-service/check/trademark、/hi/compli-service/check/trademark、/fa/compli-service/ 等
- 路径改版 /compli-service/ → /c/ 未设 301（现 /c/ 正常 200）
- **方案：** apps/site/public/_redirects 添加 `/{locale}/compli-service/* → /{locale}/c/* 301`（同时解决 4 个"重复网页无 canonical"）

### 3c. 双重语言前缀 404（23 个）
- /ja/ja/、/en/en/、/fa/fa/services、/it/it/industries、/ko/ko/services 等
- 站内当前代码无此 bug（LanguageSwitcher 逻辑正确），历史残留链接
- **方案：** 确认站内无引用后 GSC 忽略

### 3d. 其他 404（6 个）
- /ko/c/packages/、/ka/c/packages/、/no/c/packages/（页面不存在）
- /sv/c/register/login、/da/pakker/（本地化路径不存在）、/iw/quote/（旧希伯来代码 iw → he）
- **方案：** 确认后 GSC 清理

---

## 问题 4：技术 bug（3 处，代码改动）✅ 已全部修复（commit a5b428bb，2026-08-03）

### 4a. www 域 /blog/ 不重定向 ✅
- www.sinotradecompliance.com/en/blog/ 返回 200（应 301 到主域），其他路径正常 301
- 根因：apps/site/functions/_middleware.ts 中 Blog/Portal 代理逻辑在 canonical host 检查之前执行
- **修复：** canonical host 检查已移到所有 proxy 逻辑之前（RSC 204 之后）✅
- 影响：消除 www 重复内容信号，65 个备用网页中的 www 变体归位
- 验证：线上 www /en/blog/、/en/c/、/admin/ 全部 301 → 主域 ✅

### 4b. compli-service 无 301（同问题 3b）✅
- **修复：** apps/site/public/_redirects 添加 48 条 `/{locale}/compli-service/* → /{locale}/c/* 301`（同时解决 4 个"重复网页无 canonical"）
- 验证：线上 en/nl/hi/fa 全部 301 → /c/ ✅

### 4c. 认证页被收录 ✅
- /c/login、/c/register、thank-you 页多语言版本进索引（sq/c/login、id/thank-you 等）
- **修复：**
  - portal login/register：新增服务端 layout.tsx 导出 robots noindex（`{ index: false, follow: false }`）
  - site thank-you：generateMetadata 加 robots noindex
  - c/pricing 保留（有商业价值）
- 验证：线上 en/c/login、en/c/register、en/thank-you 均返回 `<meta name="robots" content="noindex, nofollow">` ✅

---

## 问题 5：备用网页 65 个（含 www 变体 + 认证页）

- 有正确 canonical 标记，GSC 标记"备用"属正常状态
- 但其中 www /blog/ 变体（4a bug）+ 认证页（4c）需要处理
- 无尾部斜杠 → 308 正常、quote/?package=xxx 正常
- **方案：** 随 4a/4c 修复自动解决

---

## 问题 6：其他已确认正常项（无需处理）

- 217 个"网页会自动重定向"（无斜杠/http/www 变体，重定向正确，sitemap 规范）
- 40 个子域名图片 URL（site./blog.sinotradecompliance.com 已下线，图片在主域存在 200）
- 1 个 th/industries 重复网页（canonical 自引用正确）
- noindex 排除 0 个

**说明：** 40 个子域名图片可在 GSC 手动移除（低优先级）。

---

## 执行顺序建议

1. **P1 技术修复**（问题 4a/4b/4c）：改动小、风险低、立即可部署
2. **P2 SEO 优化**（问题 1/2）：需要内容投入，见效 2-4 周
3. **P3 GSC 清理**（问题 3a/3c/3d/6）：手动操作

---

# 全语言场景优化方案（覆盖 223 个关键词）

## 一、优化原则（遵循现有规范）

已核查现有页面规范，优化必须**严格一致**：

| 规范 | 内容 |
|------|------|
| **FAQ 规范** | 每个服务页 6 条 FAQ（faq1-6），48 语言一致，ServiceFAQ 组件自动渲染 |
| **页面结构** | Hero → QuickAnswer → CoverSection → ProcessSteps → FAQ → PortalCTA → ContactForm → CTA |
| **文案来源** | messages/{lang}.json 的 Service* namespace（只改对应语言，不影响其他） |
| **博客规范** | frontmatter 固定格式，分类 7 种，slug 全语言一致 |
| **内链现状** | RelatedResources 是空桩，博客→服务页靠 CTA 链接 |

## 二、关键词全景（223 词，1276 展示）

**三大主题占 100%：**

| 主题 | 展示 | 主要语言 | 目标页面 |
|------|------|---------|---------|
| **CCC 认证** | 701 (55%) | de 421 / en 261 / ja 15 | /services/ccc/ + 博客 |
| **商标/品牌** | 326 (26%) | de 142 / en 141 / ru 17 / es 10 / ja 10 | /services/brand/ + 博客 |
| **进口/跨境电商** | 249 (19%) | en 234 / de 9 / it 47 / nl 16 | /services/gacc/ + /services/ecommerce/ + 博客 |

**除德语外需要覆盖的语言关键词：**
- 🇯🇵 日语：ccc 認証 取得(11)、ccc 認証(4)、トレード コンプライアンス(5)、中国 健康食品 規制(3)、海外輸出対応 健康食品 OEM(1)
- 🇷🇺 俄语：ccc маркировка(2, 排名11.5!)、сертификат ccc(1, 排名10)、импорт корма(3+2)、медицинского оборудования(6+2)、косметики(2)、регистрация товарного знака(1)
- 🇪🇸 西班牙语：gacc que es(2, 排名4.5!)、norma ccc(1, 排名1!)、proteccion de marca en alibaba(12, 排名18)、registrar/registro de marca(9)
- 🇫🇷 法语：enregistrer une marque en chine(5, 排名28)、commerce électronique transfrontalier(3)
- 🇮🇹 意大利语：import-export componenti elettronici(47, 排名89)、registrare un dispositivo medico(3)
- 🇳🇱 荷兰语：ccc certificaat china aanvragen(15)、elektronica certificeringsadvies(16)、importvergunning china(8)
- 🇵🇱 波兰语：jak wyrobić certyfikat w chinach(4, 排名16.75)、certyfikat ccc(2)
- 🇮🇱 希伯来语：יבוא קוסמטיקה לישראל(2)、יבוא מוצרי קוסמטיקה(1)
- 🇺🇦 乌克兰语：реєстрація товарного знака(1)
- 🇸🇪 瑞典语/丹麦语/挪威语：varumärke 相关

## 三、分层优化策略（按投入产出比）

### 🥇 第一层：快赢（已排名 < 30 的词，轻改即可突破）

**状态：** ✅ 全部完成（2026-08-03）

| 关键词 | 排名 | 动作 | 状态 |
|--------|------|------|------|
| gacc que es (es) | 4.5 | 保持，确认 es 页可点击性 | ✅ 已覆盖（faq1q "¿Qué es el GACC..."），无需改 |
| norma ccc (es) | 1 | 保持 | ✅ 无需改 |
| ccc маркировка (ru) | 11.5 | ru 服务页融入 "маркировка CCC" | ✅ heroSubtitle → "нанесения маркировки CCC" |
| трансграничная платформа (ru) | 12 | ru 电商页融入 | ✅ 已覆盖（"трансграничных платформах" 词根），无需改 |
| gacc lebensmittel registrierung (de) | 14 | de gacc 页确认覆盖 | ✅ 已覆盖（heroTitle "GACC-Lebensmittelregistrierung" + heroSubtitle "Lebensmittelregistrierungsanforderungen" + metaTitle），无需改 |
| gacc lebensmittel zertifizierung (de) | 19.8 | 同上 | ✅ 已覆盖（heroSubtitle "Von der GACC-Zertifizierung bis zur CIFER-Einreichung"），无需改 |
| proteccion de marca en alibaba (es) | 18 | es 品牌页融入 | ✅ faq4q → "¿Cómo protejo mi marca en Alibaba...?" |
| 中国 健康食品 規制 (ja) | 21.7 | ja 保健品相关 | ✅ 已覆盖（IndustrySupplements.heroSubtitle 含 "健康食品規制"），无需改 |
| regulatorische anforderungen (de) | 23-32 | de 电商页融入 | ✅ 已覆盖（heroSubtitle "Erfüllen Sie die regulatorischen Anforderungen..." + metaDescription），无需改 |
| enregistrer une marque (fr) | 28.2 | fr 品牌页融入 | ✅ heroSubtitle → "Apprenez à enregistrer une marque..." |

**P3 执行（commit 9d47d5b4）：** ru/es/fr 3 处修改 + 构建 + 部署（c64376b2）+ 线上验证全部生效。
de 三项（gacc lebensmittel registrierung/zertifizierung、regulatorische anforderungen）非 P3 范围，待后续确认。

### 🥈 第二层：主力攻坚（大展示 + 排名 60-90）

**CCC 主题（de + en + ja）：**
- de：ccc zertifizierung(154)、ccc zertifikat(139) → heroTitle/Subtitle/FAQ 融入
- en：ccc mark requirements(24)、ccc china(16)、ccc certification(12) → 服务页/博客优化
- ja：ccc 認証 取得(11) → ja 服务页融入
- 长尾：ccc zertifizierung kosten、ccc zertifizierungspflicht、farben ccc 系列（颜色规则词！）

**商标主题（de + es + fr + ru）：**
- de：markenschutz china(54)、markenrecht china(33) → de 品牌页 heroTitle/FAQ
- es：registrar/registro de marca(9)
- fr：enregistrer une marque(5)
- ru：регистрация товарного знака(1)

**进口主题（en + it + nl）：**
- it：import-export componenti elettronici(47) → it 服务页
- nl：ccc certificaat china aanvragen(15)、elektronica certificeringsadvies(16)、importvergunning(8)
- en：gacc 系列(28)、import license medical devices(15)、pet food registration(11)

### 🥉 第三层：内容补齐（博客主题覆盖）

现有 10 篇博客，主题匹配：
- ccc-certification-explained ↔ CCC 词（de/en/ja 优化）
- china-trademark-registration ↔ 商标词（de/es/fr/ru 优化）
- gacc-registration-guide ↔ GACC 词（de/en/es 优化）
- cross-border-ecommerce-china ↔ 电商词（de/en/it 优化）
- cosmetics-nmpa-filing ↔ 化妆品词（he/ru 优化）
- 缺口：**医疗设备无博客**（import license medical devices 15 展示）、**GB 标准无页面**（gb 28050/7718 有展示）

## 四、执行方式（保持一致性）

**每个主题/语言按同一流程：**
1. **服务页优化**：heroTitle 融入主关键词 → heroSubtitle 融入全称 → FAQ 6 条中覆盖长尾（保持 6 条结构）→ coverItems 融入专业词
2. **只改目标语言**：修改 messages/{lang}.json 对应 namespace，不影响其他语言
3. **博客联动**：对应语言博客标题/正文/内链优化
4. **构建部署验证**：site 构建 → 部署 → 线上验证标题/内容

## 五、优先级排序（建议执行顺序）

| 优先级 | 内容 | 覆盖展示 |
|--------|------|---------|
| **P1** | 德语 CCC 攻坚（ccc zertifizierung/zertifikat 293 展示） | ~300 |
| **P2** | 英语 CCC + 商标（markenschutz 54 + ccc en 系列） | ~200 |
| **P3** | 小语种快赢（es/ru/ja/fr 已排名 < 30 的词） | ~60 |
| **P4** | 荷兰/意大利语（ccc certificaat/componenti 78 展示） | ~80 |
| **P5** | 博客内容补齐（医疗设备/GB 标准缺口） | ~30 |

---

# 医疗器械 SEO 方案（2026-08-03 新增）

## 背景：GSC 医疗器械相关关键词（9 个，~39 展示）

| 关键词 | 展示 | 排名 | 语言 |
|--------|------|------|------|
| import license for medical devices in china | 15 | 85.67 | en |
| medizinprodukte china | 7 | 92.29 | de |
| china medizintechnik | 5 | 77 | de |
| registrare un dispositivo medico in cina | 3 | **26.33** | it |
| medical devices certification in thailand | 3 | 61.67 | en（泰国，不相关） |
| nmpa medical device commercialization | 3 | 96.67 | en |
| subcontratación dispositivos médicos | 1 | 79 | es |
| representante autorizado para dispositivos medicos | 1 | 85 | es |
| medical device import licenses in china | 1 | 100 | en |

## 现状诊断

- **页面存在**：/industries/medical-devices/ 行业页已有（src/data/industries.ts → packages/ui/src/data/industries.ts，namespace: IndustryMedical），内容完整（NMPA Class I/II/III 注册、进口许可证、临床评估、标签、跨境电商、创新器械快速通道，6 条 FAQ，JSON-LD，metaTitle 含 "Medical Devices China Import"）
- **收录正常**：en/de/it/es/fr/ru 主流语言已收录；仅 9 个小语种未收录（si/sl/sq/sr/sv/sw/ta/uk/ur，符合低流量语言整体模式）
- **排名差主因 = 内容-搜索词匹配度错位**：搜索词是 "import license"（进口许可证视角），heroTitle 是 "China Compliance for Medical Device Exporters"（出口商合规视角）
- **metaTitle 方向错误**：it/es/ru 的 metaTitle 是"从中国进口"（反了）
  - it: "Importazione di dispositivi medici dalla Cina" ❌（应为进口到中国）
  - es: "Importación de dispositivos médicos de China" ❌
  - ru: "Медицинское оборудование Импорт из Китая" ❌
  - fr: "Importation de dispositifs médicaux en Chine" ✅ 正确

## 三层方案

### L1 现有行业页优化（✅ 已完成 2026-08-03，commit a5b428bb）

1. **en heroTitle**："China Compliance for Medical Device Exporters" → **"Medical Device Import & NMPA Registration in China"**（对齐 import license 15 展示）✅
2. **en heroSubtitle**：融入 "import license"（当前无）✅
3. **en FAQ**：faq5q（跨境电商）保留，改 faq3q 覆盖 "How do I get an import license for medical devices in China?"（faq3a 答案同步改为 NMPA 注册证书即进口许可流程）✅
4. **de heroTitle**：→ **"Medizinprodukte China Import: NMPA-Registrierung"**（对齐 medizinprodukte china 7 + china medizintechnik 5）✅
5. **it/es/ru metaTitle 方向修正**："从中国进口" → "进口到中国" ✅
6. **it 页面**：heroTitle 融入 "registrazione dispositivi medici" 冲前 10 ✅
7. **es 页面**：metaDescription 融入 "subcontratación dispositivos médicos" ✅

**验证：** 构建 6529 项 SEO 检查 0 失败；线上 en/de/it/es/ru/fr 标题/内容全部生效（2026-08-03）

### L2 新增博客文章（执行中 2026-08-03）

- **文章**：Medical Device Import License in China: NMPA Registration Guide
- **日期**：**2025-08-20**（与 pet-food→health-supplements 的 6 个月节奏衔接，不与现有日期冲突）
- **分类**：Compliance Guide
- **理由**：fa/fr gacc 博客证明博客能排前 10；"import license" 是真实需求（15+1 展示）；现有博客无医疗器械主题
- **内容**：NMPA 进口许可证流程、Class I/II/III 分类、临床评估豁免、标签要求、常见坑
- **状态**：✅ en 源文已写（10 section，~2000 词，标题已去冒号过 R08）→ ✅ 翻译已提交 v2（blog-medical-device-20260803b，47 语言，752 项；v1 因标题含冒号 R08 取消）→ ✅ 翻译完成 100% → ✅ 47 MDX 已重组生成 → ✅ CI 检查通过 → ✅ 构建部署 → ✅ 线上验证（zh/de/es/fr/ru/ja/ar/sr 全部 200，CTA 本地化正确）
- **新增改动**：related posts 去掉"同分类≥3 篇"门槛——只要有同分类文章就显示同分类（不足 3 篇显示全部），无同分类才用其他分类补足（commit e608885a）
- **流程**：en 源文 → translate-tool 提交 47 语言 → 合并 locale → CI 检查 → 构建部署验证
- **翻译输入格式**：扁平 dict 16 keys（fm_title/fm_excerpt/ref_1-4/sec_intro~sec_help），参考宠物食品/健康食品模式
- **注意**：日期必须在当前日期之前（网站品牌 2010s 成立），且不与现有 10 篇冲突
- **坑（参考 NOTES.md）**：YAML 双引号嵌套（希伯来语）、E07 手动编号、R08 标题连字符、R04 标题级别、ref 标准号翻译、CTA URL 本地化为 /{locale}/packages/、zh 双破折号

### L3 GSC 操作（配合）

- 9 个小语种未收录 → 见下方"小语种未收录方案"
- L1 后观察 2-4 周排名变化，若 import license 仍在 50+ 再启动 L2

## 执行顺序

1. 先做 **L1**（页面优化，成本低、今天完成）
2. 观察 2-4 周排名
3. 排名未提升 → 启动 **L2**（博客文章）
4. **L3** 配合 GSC 处理

---

## 9 个小语种 medical-devices 未收录：方案分析

**涉及 URL（9 个，均在 dir7 已发现-未编入列表）：**
- si/sl/sq/sr/sv/sw/ta/uk/ur /industries/medical-devices/

**根因（与全站诊断一致）：** Google 质量判断——低流量语言 + 模板化页面，非技术问题（页面 200、canonical 正确、sitemap 规范）

**方案选项：**

| 方案 | 动作 | 成本 | 效果 | 建议 |
|------|------|------|------|------|
| A. GSC 手动验证 | 9 个 URL 逐个 "验证修复" | 低 | 低——Google 已抓取但主动选择不编入，验证通常无效 | 不优先 |
| B. noindex 这 9 页 | 加 noindex | 低 | 释放抓取预算给高价值页面；但这 9 页本身无搜索需求（0 展示），影响≈0 | 可做，但应并入全站低流量语言策略 |
| C. 全站低流量语言 noindex 评估 | 对 si/sl/sq/sr/sv/sw/ta/uk/ur 等 ~300 页整体评估 | 中 | 释放大量抓取预算，聚焦 de/en/fa/fr/es；与问题 2 方案一致 | **推荐**（并入问题 2） |
| D. 内容差异化 | 优化小语种页面内容使其非模板化 | 高 | 低——这些语言无搜索需求，投入产出比差 | 不推荐 |
| E. 忽略 | 不处理，等 Google 自然淘汰 | 0 | 无害——0 展示 0 点击，无业务影响 | 短期默认 |

**结论：** 这 9 页未收录对业务零影响（无搜索需求）。

**✅ 已决定（2026-08-03）：所有 noindex 方案（B/C）全部取消，不再考虑。**
此项工作忽略，不处理（方案 E 默认），也不做任何 noindex 评估。

**✅ 已决定（2026-08-03）：此项工作忽略，不处理。**

---

## ✅ FAQ 48 语言同步 + P4 heroSubtitle（已完成 2026-08-03）

**commit:** 943c50f4（已 push main，CF Pages 自动部署，线上验证通过）

### 完成内容
1. **FAQ 6 组跨语言主题不一致修复**（48 语言全部一致）：
   - ServiceCcc.faq3: clinical trials → 申请流程（apply + duration）
   - ServiceCcc.faq5: SDOC → 费用（cost）
   - ServiceBrand.faq4: 防伪 → Alibaba 平台品牌保护
   - ServiceGacc.faq1: Decreto 248 → GACC + 食品注册
   - IndustryMedical.faq3 / ServiceCcc.faq2: en 基准主题保留
2. **翻译方式**：translate-tool 任务停掉，251 条由 AI 人工翻译（47 语言）+ 工具已完成 310 条合并，en 更新 8 key
3. **P4 heroSubtitle 4 处**（it/nl）：
   - it ServiceCcc: import-export componenti elettronici ✅
   - it IndustryMedical: registrare un dispositivo medico ✅
   - nl ServiceCcc: elektronica certificeringsadvies ✅
   - nl IndustryMedical: importvergunning voor China ✅

### 验证
- CI 翻译质量检查 48 语言 0 问题 ✅
- site 构建 6529 页面 ✅
- 线上 it/nl/zh/en FAQ 新主题全部生效 ✅
- P4 4 处关键词线上命中 ✅

### 待观察
- GSC 后续排名变化（2-4 周后复查 ccc certificaat china aanvragen / componenti 系列）

---

# 🚀 深度差异化方案 D1-D7（2026-08-04 启动）

**背景：** Token 免费期间全量执行。Portal/Admin 是工具/后台，**不差异化**；面向客户的**主站（site）+ 博客站（blog）**全部深度差异化。

**核心原则：**
1. 事实不能变：GACC 注册流程、CCC 测试项目、5 年有效期等硬事实 48 语言一致
2. 视角可以变：举例/语境/关键词/信任元素按国家差异化（延续 T4 已确立的国家视角）
3. SEO 关键词驱动：每语言嵌入本土搜索词
4. 质量优先，禁止英文 fallback

## 各批次计划

| 批次 | 内容 | 范围 | 状态 |
|------|------|------|------|
| **D1** | 服务页全字段差异化 | 6 服务 × 48 语言 × ~41 字段（FAQ/cover/howto/jsonld/quick/cta） | ⏳ 进行中 |
| **D2** | 行业页全字段差异化 | 16 行业 × 48 语言 × ~27 字段 | ⏳ 待做 |
| **D3** | ServiceCommon + Home 差异化 | 22 + 66 keys × 48 语言 | ⏳ 待做 |
| **D4** | FAQ 页 + 次级页差异化 | Faq(97) + About/Packages/Quote/ThankYou/Testimonials/Services/Sitemap × 48 | ⏳ 待做 |
| **D5** | Blog namespace + 文章标题/excerpt | Blog(61) × 48 + 528 文章 frontmatter | ⏳ 待做 |
| **D6** | 博客正文本地化增强 + 本地市场新文章 | 528 篇增强 + 48-100 篇新文章 | ⏳ 待做 |
| **D7** | 技术 SEO 体检 | hreflang/sitemap/OG/JSON-LD/内链/canonical | ⏳ 待做 |

## D1 详细：服务页全字段差异化

**涉及 namespace（6）：** ServiceCcc / ServiceGacc / ServiceLabel / ServiceCosmetics / ServiceEcommerce / ServiceBrand

**已差异化（T4）：** heroTitle / heroSubtitle / metaTitle / metaDescription

**本次新增（每服务 ~41 字段）：**
- `faq1q-faq6q + faq1a-faq6a`（12）：FAQ 问答按国家视角重写（问题措辞本地化 + 答案含本土语境）
- `coverTitle + coverItems1-6`（7）：服务覆盖范围本地化
- `howtoTitle + howtoDescription + howtoStep1-5Name/Text`（12，Label/Ecommerce/Brand 为 4 步 10 个）：HowTo 结构化数据本地化
- `jsonldName + jsonldDescription + jsonldServiceType + serviceType`（4）：JSON-LD 结构化数据本地化
- `howTitle + howSteps`（2）：流程标题本地化
- `quickAnswerTitle + quickAnswer`（2）：快速答案本地化
- `cta + questionsTitle + questionsSubtitle + ctaUrgency`（4）：CTA 本地化

**执行方式：** 延续 T4 "一国一脚本"模式，每语言脚本处理 6 服务 × 全字段，分批（3-4 语言/批）→ 验证 → 提交 → 部署 → 线上验证。

## D1 执行日志

| 子批 | 语言 | commit | 部署 | 验证 |
|------|------|--------|------|------|
| D1-1 | de + es/it/ja/fa/fr（子代理） | dc0e3f87 / bc1b0d3a | ✅ | ✅ 线上验证通过 |
| D1-2 | ru/nl/pl/pt/ko（子代理） | 852a5ab6 | ✅ | ✅ 线上验证通过 |
| D1-3 | ar/tr/vi/th/uk（子代理） | 7cf2fdac | ✅ | ⏳ 线上验证 |
| D1-4 | no/da/fi/sv/he（子代理） | 86341f40 | ✅ | ✅ 线上验证通过 |
| D1-5 | en/zh/id/ms/hi（子代理） | 6f917d8c | ✅ | ✅ 线上验证通过 |
| D1-6 | cs/hu/ro/el/bg（子代理） | b0becaa4 | ✅ | ✅ 线上验证通过 |
