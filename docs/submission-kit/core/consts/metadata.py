# -*- coding: utf-8 -*-
"""core.consts.metadata — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

# v1.71：同一数词在部分语言有屈折/性别变体。只登记有实证的形状，
# 不整类放行；P19 查词时与原表并集匹配。
NUMBER_WORD_ALTS = {
    # ar：14 的阴性形（أربع عشرة）用于阴性名词（حزمة عمل）；原表只收阳性形
    "ar": {14: ("أربع عشرة", "أربعة عشر")},
    # he：14 的阴性形
    "he": {14: ("ארבע עשרה",)},
}


LOCALES = ["en", "zh", "es", "fr", "de", "ja", "pt", "ru", "ar", "ko",
           "it", "nl", "tr", "vi", "id", "th", "hi", "pl", "sv", "el",
           "cs", "ro", "hu", "fi", "da", "no", "uk", "bg", "hr", "sr",
           "sk", "sl", "ms", "ka", "he", "sw", "bn", "ca", "fa", "ur",
           "ta", "af", "sq", "az", "hy", "be", "ne", "si"]


CATEGORIES = ["Brand Protection", "Compliance Guide", "Cosmetics", "E-commerce",
              "Food & Beverage", "Label Compliance", "Product Certification"]


FRONTMATTER_KEYS = ["title", "slug", "date", "category", "excerpt", "references"]


# v1.59：法规（kind="regulation"）用另一套 frontmatter / 必填字段。
# 两类共用同一个检查脚本与其余全部规则，只有以下差异。
# v1.66（用户裁定）：法规只有两个日期 —— 发布日 published_at、施行日 effective_at。
# 原来那个 date（「投稿日期」）与 published_at 语义重复，是 R16 报错的根源，直接删掉。
FRONTMATTER_KEYS_REG = ["title", "slug", "category", "excerpt",
                        "doc_number", "issuer", "published_at", "effective_at",
                        "status", "source_url", "related_service"]


# related_service 允许缺省；其余必须齐
FRONTMATTER_REQUIRED_REG = [k for k in FRONTMATTER_KEYS_REG if k != "related_service"]


SUB_REQUIRED_REG = ["docNumber", "issuer", "publishedAt", "effectiveAt", "status", "sourceUrl"]


STATUS_ENUM = ("in_force", "upcoming", "amended", "repealed", "draft")


# R21（v1.66）：解读篇幅硬上限。用户裁定以「已发布法规（GACC 150 号公告）解读字数
# 的一半」为基准固定下来：中文 698 字 → 一半 349 → 取整 **300 字**。
# 其他语言按同一篇实测等义篇幅折算（非 CJK 中位 2215 / 中文 698 ≈ 3.17 倍）→ **1000 字符**。
REG_INTERPRET_MAX_CJK = 300


REG_INTERPRET_MAX_OTHER = 1000


# v1.66：法规所有「能限定成集合」的字段一律限定死，不接受自由文本。
# category 直接沿用博客那 7 个分类（用户 2026-10-29：「分类是否可以参照文章的分类」），
# 站内只有一套分类体系，48 语言标签也共用（cat_* 已存在，无需新翻）。
REG_CATEGORIES = ("Product Certification", "Compliance Guide", "Label Compliance",
                  "Brand Protection", "Cosmetics", "E-commerce", "Food & Beverage")


# 发文机关用官方英文缩写（全站统一，不翻译）
REG_ISSUERS = ("GACC", "SAMR", "NMPA", "MARA", "MOFCOM", "STA", "CNIPA",
               "NPC", "SC", "MIIT", "MEE", "NHFPC")


# 相关服务限定为站内真实存在的服务页（apps/site/.../services/<slug>/）
REG_SERVICES = ("/services/gacc/", "/services/label/", "/services/ccc/",
                "/services/cosmetics/", "/services/ecommerce/", "/services/brand/")


# R23（v3.1）：已登记的**存量** source_url 漂移，键 =(slug, lang)。
# 全库 15 份法规 submission.json 逐语扫描（tmp/.../scan_r23.py）只有这两处：
#   REG8/id 的 frontmatter PDF 时间戳写短（缺 1412）；
#   REG9/sk 的日期路径写成 2023/06/30（submission 是 2023-06/30）。
# 二者都是真实缺陷，但属已交付稿，改稿会碰另一会话在途条目的同批文件；
# 故只允许这两处降级为 warning，任何**未登记**的新漂移一律 error。
# 这是待修清单而非永久豁免：稿件侧对齐官方 URL 后须从本表删除对应条目。



ORIGINAL_MARKER = "<!-- original -->"


AUTHOR = "David Zhang"


MAX_TITLE = 85


MAX_EXCERPT = 185


# P50（v1.55）CTA 末行终止标点：末块是给读者落地的一步，句号缺失在页面上
# 表现为「句子没写完」。M1 47 语审校实测 th/he/fa/af/ca/sw/bn/ta/vi/nl/tr/it/ur
# 十四语缺终止标点（bn 用 ।、hy 用 ։、ur 用 ۔、he 用 。→.、其余用 .）。
# 泰文没有句点惯例（th 六篇一致缺，属正字法而非漏写），整语向豁免。
# v1.69：法规（kind="regulation"）整类不判——公告类法规以落款日期收尾，
# 日期行天生不带句号，补句号反而是改动官方文本的呈现（见 check_body）。
P50_TERMINAL = ".!?。！？．…؟۔।॥։"


P50_NO_TERM_LANGS = {"th"}


# P51（v1.55，v1.56 升 error ＋判据对称化）同篇百分号体例混用：M1 实测 sv/cs/
# el/ro 把列表项写成「21.4%」而正文写「20 %」——同一种语言里两套排版，读者会为
# 它们来自两个来源。ka 反向：正文一律「20 %」，列表混进「17.6%」。判据只比
# **同侧**（后缀型/前缀型）内部是否一致；跨侧（tr/pl 前缀 %20 与后缀 20%）也登记，
# 因为同一篇文章里两种方位并写就是排版事故。
# v1.56 把两侧边界对齐：一个 % 归后缀还是前缀，只看它左面贴不贴数字。旧写法
# 只给后缀加了右界、前缀没有左界，az「70% 9,1%-ə」的 % 两头不算、反被读成
# 「% 9,1」前缀，零前缀形的语向就这样被判了「前后缀并存」。
P51_NUM = r"[0-9]+(?:[.,][0-9]+)?"


P51_SP = r"[ \u00a0\u202f]"


# P54（v1.57）丹/挪「文号＋年份」的引用介词：丹麦语法源引用写 af
# （bekendtgørelse nr. 486 af 2018），挪威书写 av（kunngjøring nr. 486 av
# 2018），`fra` 留给**颁发机关**（… fra seks ministerier）。旧稿把年份与机关
# 都写成 fra，一句里两个 fra，读成「来自 2018 来自六个部门」。
# 为什么 v1.56 之前不判、这一版才判：跨篇差异不是缺陷——统一改稿（六包 86 处）
# 之前 `fra` 形在别篇是自洽写法，全局禁用会把正确稿件判红（与 P53 撤掉全局
# banned pt-connosco 同一条教训）。改完之后「文号＋fra＋年份」在每一篇都不
# 成形，本条才可以点火。**先改稿、后立规**，不是先禁再改。
# 变体口径要跟 fra 无关：ø 可写 o、æ 可写 ae（无本地键盘的正字法转写），
# 判据是介词写错，文号词怎么拼不该决定它能不能被看见。
# fra…fra 双写是本条的第二种形状（年份与机关同用一个介词，中间只隔一个年份）。
# 不加界就会误红：丹麦语自然句「rapporten fra 2018 fra seks ministerier」（2018
# 年出自六个部门的报告）两个 fra 都合法。所以双写只在**同一行的文号射程内**才算
# 缺陷——以「nr. + 编号」为锚，而不是以 P54_DOC 词形为锚：锚在 nr. 上还能兜住
# 词表外的文号名（lov / forordning / 未收的复合词），锚在文号词上则漏。
# 与 P51 左右界不对称同型的假阳性，宁可在立规这一版就收掉。
P54_DOUBLE_RE = re.compile(r"\bnr\.?\s*\d{1,4}[^\n]{0,40}?\bfra\s+20\d\d\s+fra\b",
                           re.I)


# P35 整块照抄：低于该字符数的块不判（短句、编号、代码片段天然跨语言同形）
COPY_BLOCK_MIN = 40


# P35 与英文比对时要求的词数下限（避免把 "S0 S1 S3" 类枚举判成未译）
COPY_BLOCK_WORDS = 5


# P65（v2.18）官方文本里的拉丁学名必须逐字保留。
# REG16 47 语重译实证：bn 把 7 个学名整块音译成孟加拉文、旧稿把 Lobesia botrana
# 译成「椋鸟」、多处把属名/种加词拆开改写。P30 只管「拉丁残留过多」，管不到
# 「该保留的拉丁串被抹掉」；P23 只看块型与规模。学名是检疫对象的唯一标识，
# 音译后无法与议定书原文对照，因此单独立规。
# 形如「属名首字母大写 + 种加词全小写」的二元组；STOPWORDS 排除英文声明/机构名
# 里形似的普通词组（This consignment / Fruits from / General Administration…）。
SCI_BINOMIAL_RE = re.compile(r"\b([A-Z][a-z]{3,})\s+([a-z]{4,})\b")


# P65 扩展（v2.20）：林奈命名人缩写 `L.` 是学名的一部分。
# REG19 实证：母版商品名块写 `Citrullus lanatus L.`，双名法只抓
# `Citrullus lanatus`，RTL 语向（ar/he/fa/ur）漏掉 `L.` 时 P65 全绿——
# 学名不完整，无法与议定书原文逐字对照。只收最常用且无歧义的 `L.`
# （REG18 `Theobroma cacao L.` 同型），其他命名人不猜。
SCI_AUTHOR_L_RE = re.compile(r"\b([A-Z][a-z]{3,})\s+([a-z]{4,})\s+(L\.)")


# 存量欠账名单已移入策略库 baseline 表（schema v5）：判据只由「语向 +
# 词类 + 结构」决定，任何判据源码里不再出现篇目 slug。查欠账：
#   python submit.py glossary baseline list
# 清账：改完稿把该行 status 置 closed，不删除行（保留交付痕迹）。


SCI_STOPWORDS = frozenset("""
    This The These Those That Fruits Stone Fresh Export Exported Protocol
    Requirements Phytosanitary Quarantine China Chinese People Republic
    General Administration International Standard Measures Customs
    Announcement Import Imports Exportation Plum Apricot European Turanian
    Great Brown Peach Scale Moth Wasp Sawfly Aphid Pest Pests Area Areas
    Cold Treatment Transit Storage Shipment Lot Lots
""".split())


MAX_MDX_BYTES = 100 * 1024


MAX_IMAGE_BYTES = 400 * 1024


MAX_PACKAGE_BYTES = 60 * 1024 * 1024


COVER_SIZE = (1200, 630)


MIN_IMAGE_WIDTH = 1200


MIN_EN_WORDS = 400


# W02 超长段落：按文字系统给出不同口径。
# 拉丁/西里尔/希腊等语言一个字符≈半个词，400 字符约等于 70 词；
# 中日韩等语言一个字符≈一个词，同样篇幅的段落阅读负担更重，
# 因此对这类语言收紧阈值，避免同一内容在不同语言上判定不一致。
MAX_PARAGRAPH_CHARS = 400


MAX_PARAGRAPH_CHARS_CJK = 340


MAX_PARAGRAPH_CHARS_DENSE = 300


# v1.59 W02 膨胀感知系数：译文段长 ≤ 母版段长 × 系数时视为自然膨胀放行。
# REG1（法律条文，中文高度浓缩）实测拉丁膨胀 2.9-5.5x（中位 3.86x）；
# 普通博客正文膨胀 1.5-2.5x 更在射程内。
# v1.71 按 M1-M3 实测回填：拉丁峰值为 el 5.02x（中文 98 字符的希腊文
# 段落 492 字符，内容逐句对应、无冗余），5.0 差 0.02 仍报假红，上调 5.1；
# th 峰值 3.56x（M3 第 23 段），3.0 连报 6 段，上调 3.6。系数只放行
# 「与母版逐块对齐且段长成比例」的段落，真正的注水段在绝对阈值处仍会报。
# v2.09 按 REG13 逐块对齐实测再校准：47 语 × 75 块里超 400 字符的 393 段
# 全部是逐句对应的自然膨胀，峰值拉丁 el 5.97x（zh 120 字 → 717 字符）、
# fr 5.92x（zh 89 字 → 527）、dense th 3.91x。旧系数 5.1/3.6 在 19 语上
# 报了 19 条咨询噪声。整类放宽不做——仍要求与母版逐块对齐且段长成比例，
# 绝对阈值 400/340/300 也不动，真注水段照旧出声。
W02_EXPANSION_LATIN = 6.0


W02_EXPANSION_CJK = 1.5


__all__ = ['AUTHOR', 'CATEGORIES', 'COPY_BLOCK_MIN', 'COPY_BLOCK_WORDS', 'COVER_SIZE', 'FRONTMATTER_KEYS', 'FRONTMATTER_KEYS_REG', 'FRONTMATTER_REQUIRED_REG', 'LOCALES', 'MAX_EXCERPT', 'MAX_IMAGE_BYTES', 'MAX_MDX_BYTES', 'MAX_PACKAGE_BYTES', 'MAX_PARAGRAPH_CHARS', 'MAX_PARAGRAPH_CHARS_CJK', 'MAX_PARAGRAPH_CHARS_DENSE', 'MAX_TITLE', 'MIN_EN_WORDS', 'MIN_IMAGE_WIDTH', 'NUMBER_WORD_ALTS', 'ORIGINAL_MARKER', 'P50_NO_TERM_LANGS', 'P50_TERMINAL', 'P51_NUM', 'P51_SP', 'P54_DOUBLE_RE', 'REG_CATEGORIES', 'REG_INTERPRET_MAX_CJK', 'REG_INTERPRET_MAX_OTHER', 'REG_ISSUERS', 'REG_SERVICES', 'SCI_AUTHOR_L_RE', 'SCI_BINOMIAL_RE', 'SCI_STOPWORDS', 'STATUS_ENUM', 'SUB_REQUIRED_REG', 'W02_EXPANSION_CJK', 'W02_EXPANSION_LATIN']
