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
1. 低流量语言（af/sq/ur/ne 等约 300+ 页）评估 noindex，释放抓取预算
2. 聚焦资源到有搜索需求的语言（de/fa/fr/en/es）
3. 优化模板化页面内容差异化（标题/正文）

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

## 问题 4：技术 bug（3 处，代码改动）

### 4a. www 域 /blog/ 不重定向
- www.sinotradecompliance.com/en/blog/ 返回 200（应 301 到主域），其他路径正常 301
- 根因：apps/site/functions/_middleware.ts 中 Blog/Portal 代理逻辑在 canonical host 检查之前执行
- **方案：** 将 canonical host 检查（getCanonicalHost）移到所有 proxy 逻辑之前（RSC 204 之后）
- 影响：消除 www 重复内容信号，65 个备用网页中的 www 变体归位

### 4b. compli-service 无 301（同问题 3b）

### 4c. 认证页被收录
- /c/login、/c/register、thank-you 页多语言版本进索引（sq/c/login、id/thank-you 等）
- **方案：** c/login、c/register、thank-you 加 noindex（c/pricing 保留，有商业价值）

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

| 关键词 | 排名 | 动作 |
|--------|------|------|
| gacc que es (es) | 4.5 | 保持，确认 es 页可点击性 |
| norma ccc (es) | 1 | 保持 |
| ccc маркировка (ru) | 11.5 | ru 服务页融入 "маркировка CCC" |
| трансграничная платформа (ru) | 12 | ru 电商页融入 |
| gacc lebensmittel registrierung (de) | 14 | de gacc 页确认覆盖 |
| gacc lebensmittel zertifizierung (de) | 19.8 | 同上 |
| proteccion de marca en alibaba (es) | 18 | es 品牌页融入 |
| 中国 健康食品 規制 (ja) | 21.7 | ja 保健品相关 |
| regulatorische anforderungen (de) | 23-32 | de 电商页融入 |
| enregistrer une marque (fr) | 28.2 | fr 品牌页融入 |

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
