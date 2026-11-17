# -*- coding: utf-8 -*-
"""core.consts.claims — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

OFFICIAL_EN_LITERALS = (
    "CHIA SEED FROM BOLIVIA",
    "Cold treatment in transit",
    "Exported to the People's Republic of China",
    "This consignment complies with requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Kiwi Fruits from Iran to China, and is free from any quarantine pests of concern to China.",
    "This consignment complies with the requirements described in the Protocol of Phytosanitary Requirements for the Export of Chia Seeds from BOLIVIA to China and is free from quarantine pests concerned to China.",
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Banana Fruits from Peru to China, and is free from quarantine pests of concern to China.",
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Berries from Kyrgyz Republic to China, and is free from any quarantine pests of concern to China.",
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Cherries from South Africa to China, and is free from quarantine pests of concern to China.",
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Citrus from Botswana to China, and is free from any quarantine pests of concern to China.",
    "This consignment does not carry quarantine pests of concern to the Chinese side such as false codling moth (Thaumatotibia leucotrata), cowpea weevil (Callosobruchus maculatus), larger grain borer (Prostephanus truncatus) and khapra beetle (Trogoderma granarium).",
    "This consignment does not carry the following quarantine pests of concern to the Chinese side: cowpea weevil (Callosobruchus maculatus), larger grain borer (Prostephanus truncatus), khapra beetle (Trogoderma granarium), almond moth (Cadra cautella), carob moth (Ectomyelois ceratoniae), tropical meal moth (Pyralis manihotalis), broad-nosed grain weevil (Caulophilus oryzae), dark flour beetle (Tribolium destructor) and kidney-spotted skin beetle (Trogoderma inclusum).",
    "This consignment does not carry the following quarantine pests of concern to the Chinese side: khapra beetle (Trogoderma granarium), Verticillium wilt fungus (Verticillium dahliae), spiralling whitefly (Aleurodicus dispersus), dried fruit moth (Cadra calidella), dark flour beetle (Tribolium destructor) and mango bacterial black spot pathogen (Xanthomonas campestris pv.",
    "This consignment of blueberries complies with requirements specified in the Protocol of Phytosanitary Requirements for Export of Polish Fresh Blueberries to China, and is free from any quarantine pests of concern to China.",
    "This consignment of persimmons complies with the Phytosanitary Requirements for Export of Fresh Persimmons from Korea to China, and is free from any quarantine pests of concern to China.",
    # REG16（143 号塔吉克斯坦鲜食核果）：注意无 any，且与 140 号 Fresh Cherries
    # 形近，两串必须分别登记，不能合并成跨句掩码（v2.13 的教训）。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Stone Fruits from Tajikistan to China, and is free from quarantine pests of concern to China.",
    # REG17（52 号越南鲜食柚子和莱檬）：含 any，与 152 号 Fresh Citrus /
    # 143 号 Fresh Stone Fruits 形近，按 v2.13 教训必须单独整串登记。
    # 未登记时 21 个非拉丁语向的 the/requirements/and/from/china 撞 P30 假阳。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Pomelos and Limes from Viet Nam to China, and is free from any quarantine pests of concern to China.",
    # REG18（147 号非洲建交国家可可豆）：官方商品英文名，出现在本公告商品
    # 定义括注与附加声明两处，逐字保留；单独登记以整串剥离 cocoa/beans。
    "Cocoa Beans",
    # REG18 附加声明独有整句：无 Protocol of、无 any，与 143 号 Fresh Stone
    # Fruits / 52 号 Fresh Pomelos and Limes 形近，按 v2.13 教训单独整串登记。
    # 未登记时 from(2) 等英文语法词会让非拉丁语向撞 P30 假阳。
    "This consignment complies with Phytosanitary Requirements for Export of Cocoa Beans from Africa to China, and is free from quarantine pests of concern to China.",
    # REG20（154 号智利鲜食水果补充要求）：托盘/包装箱官方英文识别要素。
    # 154 号用 Export to...（REG17 的 52 号公告是 Exported to...），两种词形
    # 都在库存在于不同公告，必须分别整串登记，不能合并。
    "Export to the People's Republic of China",
    # REG20 附件3 途中冷处理证书标注串（小写起头、与中文括注并列）；与
    # REG10 已登记的 "Cold treatment in transit" 词序不同，单独整串登记。
    "in transit cold treatment",
    # REG23（142 号土耳其月桂叶）证书附加声明整句：无 any、商品名是
    # Laurel leaves、国名写 Türkiye（带 ü），与 143 号 Fresh Stone Fruits /
    # 52 号 Fresh Pomelos and Limes / 147 号 Cocoa Beans 形近，按 v2.13
    # 教训必须单独整串登记，不能并入跨句掩码。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Laurel leaves from Türkiye to China, and is free from quarantine pests of concern to China.",
    # REG23 包装箱/托盘标识串：首发页原文用 U+2019 弯撇号（People’s），
    # 与 REG17 已登记的 ASCII 撇号 "Exported to the People's Republic of
    # China" 字符不同，_OFFICIAL_EN_RE 是逐字整串匹配，故须单独登记。
    "Exported to the People’s Republic of China",
    # REG24（109 号缅甸鲜食香蕉）证书附加声明整句：与 REG10（234 号秘鲁
    # 鲜食香蕉）形近但国名 Myanmar≠Peru，且本篇是 "free from the
    # quarantine pests"（多定冠词 the）。按 v2.13 教训必须单独整串登记，
    # 不能并入跨句掩码，否则 the 等英文语法词会让非拉丁语向撞 P30 假阳。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Banana Fruits from Myanmar to China, and is free from the quarantine pests of concern to China.",
    # REG26（79 号马达加斯加花生）包装标识英文串：官方 PDF 实证 U+2019
    # 弯撇号，且是 "This product will be exported to the People's Republic
    # of China"（多 This product will be 前缀、will be exported 动词形），
    # 与 REG17 ASCII 形 / REG23 弯撇号 Exported 形 / REG20 Export 形均不同，
    # 逐字整串单独登记。
    "This product will be exported to the People’s Republic of China",
    # REG26 证书附加声明整句：句首 The（非 This consignment）、议定书名是
    # "the Peanut Protocol from Madagascar to China"（非 Protocol of
    # Phytosanitary Requirements for Export of ...）、"concerned by China"
    # （非 of concern to），与库内全部声明串不同形，单独整串登记。
    "The consignment complies with the phytosanitary requirements described in the Peanut Protocol from Madagascar to China and is free from the quarantine pests concerned by China",
    # REG27（55 号西班牙开心果和无花果干）包装标识英文串：官方 PDF 用
    # "This product is exported to..."（This product + is exported），与 REG17
    # ASCII 形 "Exported to..."、REG23 弯撇号形、REG20 "Export to..."、
    # REG26 "This product will be exported..." 均不同，逐字整串单独登记。
    "This product is exported to the People's Republic of China",
    # REG27 两条证书附加声明整句：句首 The batch of pistachios / dried figs，
    # 议定书名是 Protocol on Inspection, Quarantine and Sanitary Requirements
    # for the Export of Pistachios and Dried Figs ...（不是 Protocol of
    # Phytosanitary Requirements ...），含签署日 April 14th, 2026 与两份不同
    # 的有害生物清单。按 v2.13 教训必须分别整串登记，不能合并成跨句掩码，
    # 否则 the/and/from/china 等英文语法词会让非拉丁语向撞 P30 假阳。
    "The batch of pistachios certified by this phytosanitary certificate complies with the provisions of the Protocol on Inspection, Quarantine and Sanitary Requirements for the Export of Pistachios and Dried Figs from the Kingdom of Spain to the People's Republic of China Between the General Administration of Customs of the People's Republic of China and the Ministry of Agriculture, Fisheries and Food of the Kingdom of Spain signed on April 14th, 2026, by Spain and China. The consignment is free from Ectomyelois ceratoniae (Zeller), Trogoderma inclusum LeConte, Trogoderma variabile Ballion, and Trogoderma versicolor (Creutzer), and other quarantine pests of concern to the Chinese side.",
    "The batch of dried figs certified by the phytosanitary certificate complies with the provisions of the Protocol on Inspection, Quarantine and Sanitary Requirements for the Export of Pistachios and Dried Figs from the Kingdom of Spain to the People's Republic of China Between the General Administration of Customs of the People's Republic of China and the Ministry of Agriculture, Fisheries and Food of the Kingdom of Spain signed on April 14th, 2026, by Spain and China. The consignment is free from Ceratitis capitata Wiedemann, Cydia pomonella (L.), Sowbane masaic virus(SoMV), Ectomyelois ceratoniae (Zeller), and Trogoderma versicolor (Creutzer), and other quarantine pests of concern to the Chinese side.",
    # REG28（105 号缅甸植物源性中药材）证书附加声明整句：商品名
    # Plant-derived Medicinal Materials、国名 Myanmar，与库内 109 号
    # Fresh Banana Fruits from Myanmar 形近但不同，按 v2.13 教训单独整串。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Plant-derived Medicinal Materials from Myanmar to China, and is free from quarantine pests of concern to China.",
    # REG30（124 号老挝花生）两条官方英文逐字串。包装标识用 「This consignment
    # is exported to ...」，与 REG19 的 「This product will be exported ...」、
    # REG26/REG27 的 「This product is exported ...」均不同；证书附加声明的
    # 议定书名是 Protocol for Peanut from Laos to China（不是 Protocol of
    # Phytosanitary Requirements ...）。按 v2.13 教训分别整串登记，避免
    # this / consignment / the / from / china 在非拉丁语向撞 P30 假阳。
    "This consignment is exported to the People's Republic of China",
    "This consignment complies with the phytosanitary requirements described in the Protocol for Peanut from Laos to China, and is free from pests of concern to China",
    # REG39（110 号柬埔寨鲜食菠萝蜜）证书附加声明整句。与 102 号老挝
    # Fresh Jackfruits from Lao PDR / 152 号博茨瓦纳 Fresh Citrus from
    # Botswana 议定书名不同，按 v2.13 教训单独整串登记，避免 this / the /
    # requirements / from / china 在非拉丁语向撞 P30 假阳。本篇另有包装
    # 标识串 Exported to the People's Republic of China（已在全局表首位）。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of Fresh Jackfruits from Cambodia to China, and is free from quarantine pests of concern to China.",
    # REG37（103 号老挝辣椒）证书附加声明整句：议定书名是
    # "chilies from Lao PDR"，与 REG32（102 号老挝鲜食菠萝蜜
    # Fresh Jackfruits from Lao PDR）、REG39（110 号柬埔寨
    # Fresh Jackfruits from Cambodia）形近但商品名与国别组合不同，
    # 按 v2.13 教训单独整串登记。未登记时非拉丁语向的
    # this / the / requirements / from / china 撞 P30 假阳；hy 语向更会把
    # 串末的 ASCII 句点当成亚美尼亚文句末句点，P42 报 error（v330 实测）。
    # 官方串逐字受 S08 verbatim 契约保护，不得改动串内标点。
    "This consignment complies with the requirements specified in the Protocol of Phytosanitary Requirements for Export of chilies from Lao PDR to China, and is free from quarantine pests of concern to China.",
    # REG70（22 号乌拉圭碧根果）证书附加声明整句：句首 The batch of pecan
    # nuts，议定书名是 Protocol on Inspection, Quarantine and Sanitary
    # Requirements for Pecan Nuts to Be Exported from Uruguay to China，
    # 签署日 February 3th, 2026（官方原文拼写，非 3rd），有害生物清单为
    # Trogoderma granarium Everts / Pestalotiopsis clavispora /
    # Phytophthora cactorum。与 REG27 已登记的 The batch of pistachios /
    # dried figs 两串同族但商品名、议定书名、签署日、清单四项全不同，
    # 按 v2.13 教训必须单独整串登记，不能并入跨句掩码。
    # 未登记时 hy 语向 P42 把串内「…by Uruguay and China. The consignment…」
    # 的分句点判成亚美尼亚文句末 ASCII 句点（cv422 实测 1 error）；
    # 官方串受 S08 verbatim 保护，不得改动串内标点，只能按缺陷族整串登记。
    "The batch of pecan nuts certified by this phytosanitary certificate complies with the provisions of the Protocol on Inspection, Quarantine and Sanitary Requirements for Pecan Nuts to Be Exported from Uruguay to China signed on February 3th, 2026, by Uruguay and China. The consignment is free from Trogoderma granarium Everts, Pestalotiopsis clavispora, Phytophthora cactorum and other quarantine pests of concern to the Chinese side.",
    # REG75（84 号柬埔寨龙眼干）证书附加声明整句：句首 The consignment
    # （非 This consignment）、议定书名是 Protocol of Inspection, Quarantine
    # and Sanitary Requirements for Dried Longan Exported from Cambodia to
    # China（非 Protocol of Phytosanitary Requirements ...）、requirement
    # 单数（非 requirements 复数）、无 any。与 REG39（110 号柬埔寨鲜食
    # 菠萝蜜 Fresh Jackfruits from Cambodia）同国但商品名、议定书名、
    # 句首词、单复数四项全不同，按 v2.13 教训必须单独整串登记，不能并入
    # 跨句掩码。未登记时非拉丁语向的 the / and / from / china / complies
    # 撞 P30 假阳；hy 语向 P42 把串末 ASCII 句点判成亚美尼亚文句末句点。
    "The consignment complies with the requirement specified in the Protocol of Inspection, Quarantine and Sanitary Requirements for Dried Longan Exported from Cambodia to China, and is free from quarantine pests of concern to China.",
    # REG77（82 号巴基斯坦干坚果）证书附加声明整句：句首 The dried fruits
    # and nuts certified by this phytosanitary certificate（与 REG27 的
    # The batch of pistachios / dried figs、REG70 的 The batch of pecan nuts
    # 同族但商品名不同）；议定书名 Inspection, Quarantine and Sanitary
    # Requirements for Dried Fruits and Nuts to Be Exported from Pakistan，
    # 签署日 May 25th, 2026 in Beijing（官方形，非 25th→别的形），结尾
    # by the Chinese Party.（非 to the Chinese side.）。按 v2.13 教训必须
    # 单独整串登记，不能并入跨句掩码。串内含两个句子（...China. The dried
    # fruits...），未登记时 hy 语向 P42 把分句点判成亚美尼亚文句末 ASCII
    # 句点，非拉丁语向撞 P30 假阳；官方串受 S08 verbatim 保护，不得改串内
    # 拼写与标点，只能按缺陷族整串登记。
    "The dried fruits and nuts certified by this phytosanitary certificate comply with the provisions of the Protocol on Inspection, Quarantine and Sanitary Requirements for Dried Fruits and Nuts to Be Exported from Pakistan to China signed on May 25th, 2026 in Beijing by Pakistan and China. The dried fruits and nuts are free from quarantine pests of concern by the Chinese Party.",
    # REG78（1 号法国苜蓿草）植物检疫证书附加声明整句：句首 This consignment，
    # 但议定书名是 Protocol on the sanitary and phytosanitary requirements
    # for the export of alfalfa from France to China（小写起头、sanitary and
    # phytosanitary requirements 词序，非 Phytosanitary Requirements ...），
    # 结尾 "free of any pest of concern for China"（of/for 非 from/to），与库内
    # 全部声明串不同形，按 v2.13 教训单独整串登记，不能并入跨句掩码。官方串
    # 受 S08 verbatim 保护，不得改串内大小写与标点；未登记时非拉丁语向的
    # this / the / and / from / china 撞 P30 假阳，hy 语向 P42 还会把串末
    # ASCII 句点判成亚美尼亚文句末句点。
    "This consignment complies with the Protocol on the sanitary and phytosanitary requirements for the export of alfalfa from France to China, and is free of any pest of concern for China.",
    # REG78 卫生证书声明整句：句首 Does not contain（非 This/The 起句），
    # 串内 China's 用 ASCII 撇号（官方 .doc 原始 UTF-16LE 实证，非 U+2019），
    # 含 GMOs 复数与两处 does not，与库内任何声明串不同形，单独整串登记。
    # 未登记时 does / not / contain / standards / china 等英文词在非拉丁语向
    # 撞 P30 假阳；官方串受 S08 verbatim 保护，不得改串内标点。
    "Does not contain any hazardous substances that pose a risk to public or animal health and complies with China's safety and hygiene standards, does not contain GMOs that are not authorized by China.",
    # REG78 包装标识英文串：官方原文 "Alfalfa from France export to the
    # People's Republic of China"（export 无 -ed、无 will be / is 系动词），
    # 与 REG17 "Exported to..."、REG20 "Export to..."、REG26 "This product
    # will be exported..."、REG27 "This product is exported..."、
    # REG30 "This consignment is exported..." 五种词形均不同，逐字整串登记。
    "Alfalfa from France export to the People's Republic of China",
    # REG80（80 号非洲腰果）植物检疫证书附加声明整句：与已登记的 REG18 非洲
    # **可可豆**串 `... Export of Cocoa Beans from Africa to China ...` 仅商品名
    # Cocoa Beans→Nuts 一处之差，其余（This consignment / Phytosanitary
    # Requirements / Export of / Africa to China / free from quarantine pests
    # of concern to China）逐字相同。按 v2.13 教训必须另立整串条目，不得因
    # 「只差一个词」就并入既有条目或改写成通配跨句掩码：掩码是逐串剥离，
    # 通配会把尚未登记的新商品名一并放行，等于把 P30/P42 的防线拆掉。
    # 未登记时非拉丁语向的 this / consignment / complies / export / africa /
    # china 撞 P30 假阳，hy 语向 P42 把串末 ASCII 句点判成亚美尼亚文句末句点。
    "This consignment complies with Phytosanitary Requirements for Export of Nuts from Africa to China, and is free from quarantine pests of concern to China.",
)


_OFFICIAL_EN_RE = re.compile("|".join(
    re.escape(s).replace(r"\\ ", r"\\s+") for s in OFFICIAL_EN_LITERALS),
    re.IGNORECASE)


# v1.47 豁免（F4 触发）：整词恰好是 P0 时不是页码引用，是优先级档位名。
# 实证：F4 中文母版「4 个 P0 前提」沿用 deck p09 原文 "P0 prerequisites"，
# 而本系列首篇代号也是 P0；R07 的 p\d{1,3} 把 48 语全部判 error。
# 页码从 1 起，P0 作为页码本来就不成立。
# 这是**收窄**不是放宽：只放行命中串整词等于 "p0" 的那一种形状，
# P01 / p007 / p15 / page 12 / Slide 7 / 第 3 页 / スライド 5 / 슬라이드 4
# 全部照旧判红（电池见 posts/F4-*/pipeline/negative_test_r07_p0.py U1/U3）。
# 粘在 CJK 后面的 "P0前提" 本来就因 (?![\w]) 不落射程，行为不变。
# 数字分隔符：千分位（, . 阿拉伯千分位 ٬ 窄/普通空格 撇号）与小数点（. , 阿拉伯小数点 ٫）
NUM_SEP = r"[.,\u066C\u066B\u00A0\u202F' ]"


# 混文字系统检测覆盖的脚本（不含 Hangul/假名/汉字——ko/ja 黏着助词属正常书写）
_MIX_SCRIPT_KEYS = ("ARABIC", "HEBREW", "CYRILLIC", "GREEK", "DEVANAGARI",
                    "BENGALI", "TAMIL", "SINHALA", "GEORGIAN", "ARMENIAN", "THAI")


# 本族数字语言（韩文数字/阿拉伯-印度数字等），normalize_digits 已统一映射
ELLIPSIS_RE = re.compile(r"\.\.\.|…")


DBLPUNCT_RE = re.compile(r"(?<!\.)\.\.(?!\.)|,,|\?\?|!!|、、|。。|，，|،،|؛؛")


DBLSPACE_RE = re.compile(r"(?m)\S(  +)\S")


TRIPLE_NL_RE = re.compile(r"\n{3,}")


# 同形词连写的多词 lexeme：第二个同形词其实是**更长词组的首词**，不是写重。
# sq 属格冠词 `të` 撞「të dhëna」（数据）／「të njëjti」（同一个）；
# vi `văn` 撞「văn bản」（文书/文本）；ur `پہلے`（之前）撞 `پہلے دو`（前两个）。
# 逐 (语言, 词, 续词前缀) 登记——与 REDUPLICATION_OK/LATIN_ALLOWLIST 同一口径。
REPEAT_LEXEME_NEXT = {
    "sq": {"të": ("dhën", "njëjt")},
    "vi": {"văn": ("bản",)},
    "ur": {"پہلے": ("دو", "تین", "پہلا", "پہلے")},
    # hi 与 ur 同型：「कोटेशन से पहले पहले दो देखिए」＝「报价之前先看前两个」，
    # 第二个 पहले 是 `पहले दो`（前两个）的首词，不是写重（v1.58 六包复扫实测）
    "hi": {"पहले": ("दो", "तीन", "तीसरा", "तीसरे", "चार")},
}


_REPEAT_NEXT_RE = re.compile(r"\s*([^\s]+)")


# 重叠副词白名单（P10）：精确词组，逐条登记
REDUPLICATION_OK = {
    "tr": {"ayrı ayrı", "tek tek"},
    # v2.98：ur ساتھ ساتھ（ke saath saath = 连同/以及）是词典化复合后置词，
    # 与 باری باری 同属重叠副词族；REG32 阶段 4 主线程亲审实证：存量 4 处
    # 合法命中（C5/L1 图片 alt，属 P10 射程外），误改 ساتھ ہی 会弱化母版
    # 「连同枝叶一并剔除」的语义。按缺陷族登记，逐词组放行、不做整类豁免。
    "ur": {"باری باری", "ساتھ ساتھ"},
    "id": {"satu satu"},
    "ms": {"satu satu"},
    # v1.58：vi `song song`（平行）是词典化重叠形容词（từ láy），F4 vi 正文
    # 「đặt song song trong giai đoạn chẩn đoán」（在诊断阶段并行安排）实抓。
    # 逐词组放行、不做整类豁免——同一口径沿用 v1.14 与 M1 收官批「不扩白名单」的
    # 判据：能改写的重叠（he/si/sw/ur 的逐一形）本轮一律改稿，只有词典里作为
    # 一个词存在的重叠才进这张表。
    # v1.59：sw `hiyo hiyo` / `huo huo`（指示词强调重叠，「正是那天／就在那时」，
    # REG1 首轮实抓）——改写丢义（siku hiyo hiyo＝on that very day，删重叠就
    # 丢掉「正是」语义），与 si එක් එක් 限定词用法合法的判据同源：这是词典语法
    # 形态，不是「逐一/分步」习语。
    "vi": {"song song"},
    "sw": {"hiyo hiyo", "huo huo"},
    # v2.04：bn সঙ্গে সঙ্গে（词典化重叠副词「立即」，REG12 全篇 6 处实锤，
    # 「一旦发现→立即防治」固定搭配，改写丢「随即」语义）；sq dhe dhe（同形
    # 异义：dhe＝连词「和」兼名词「土壤」，«gjethe dhe dhe»＝「叶和土壤」，
    # REG12 sq 实锤——两词各司其职，非重叠习语）。
    "bn": {"সঙ্গে সঙ্গে"},
    "sq": {"dhe dhe"},
}


__all__ = ['DBLPUNCT_RE', 'DBLSPACE_RE', 'ELLIPSIS_RE', 'NUM_SEP', 'OFFICIAL_EN_LITERALS', 'REDUPLICATION_OK', 'REPEAT_LEXEME_NEXT', 'TRIPLE_NL_RE', '_MIX_SCRIPT_KEYS', '_OFFICIAL_EN_RE', '_REPEAT_NEXT_RE']
