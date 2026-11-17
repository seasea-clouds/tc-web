# -*- coding: utf-8 -*-
"""core.consts.rules — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

# v2.09：计量单位符号（°C / g/m3 / km2 …）后接本语格后缀或「/本语词」
# 属正字法，不是漏改。REG13 实抓 hy `g/m3-ից`（从格）、si `°C/දින`
# （°C/天）两条假阳。v2.22（REG20 回流）：小写 SI 单位＋本语格后缀同属
# 正字法——REG20 阶段 4 逐语直读实抓 hy `mm-ից`、ka `mm-ზე` 两条 KEEP
# 假阳（毫米与格词尾连写是 hy/ka 正字，裁定表载「技术单位+本族格后缀」），
# 补登记小写 SI 单位核心。只认表内单位，普通小写英文词＋本地词尾
# （marketها / compliance-ով）照旧判红——P08 要抓的形状不变。


# P34：全角标点（CJK 正字法之外的残留）
FULLWIDTH_PUNCT_RE = re.compile(r"[\uFF0C\u3002\uFF1B\uFF1A\uFF1F\uFF01\u3001\uFF08\uFF09\u300C\u300D\u300E\u300F\u3010\u3011\u300A\u300B\u3008\u3009]")



KNOWN_RULES = frozenset({"B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "C01", "F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10", "F11", "I01", "I02", "I03", "I04", "I05", "I06", "I07", "I08", "I09", "L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08", "L09", "M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12", "M13", "P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20", "P21", "P22", "P23", "P24", "P25", "P26", "P27", "P28", "P29", "P30", "P31", "P32", "P33", "P34", "P35", "P36", "P38", "P39", "P40", "P41", "P42", "P43", "P44", "P45", "P46", "P47", "P48", "P49", "P50", "P51", "P52", "P53", "P54", "P55", "P56", "P57", "P58", "P59", "P60", "P61", "P62", "P63", "P64", "P65", "P66", "P67", "P68", "P69", "P70", "P71", "P72", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R10", "R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20", "R21", "R22", "R23", "R24", "S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14", "ST01", "ST02", "ST03", "ST04", "ST05", "ST06", "ST07", "ST08", "W01", "W02", "W03", "H01", "H02", "P73", "P74", "P75", "WR01", "WR02", "WR03", "WR04", "WR05"})

# core 级规则：由 core/checker.py（包级守卫）与 core/kit_hygiene.py（工具包体检）
# 发射，没有对应插件——它们必须在插件层之前/之外就能报，不能写成 plugins/。
# loader.coverage 把这一组并进「已声明」，否则 doctor 会把它当漏声明。
CORE_RULES = frozenset({"C01", "H01", "H02"})

# 插件分类词表（M6 补齐，方案 §2 的「13 类」落成可机检常量）。
# loader 校验「CATEGORY == 文件名前缀」之外，还要校验前缀在本表内——
# 否则新造第 14 类不会被任何断言拦住，分类会随人走样。
# pack / audit / contract 三类为保留位：打包与术语审计已收进 core/，
# 这三个分类目前无插件，属正确状态。
PLUGIN_CATEGORIES = (
    "structure", "frontmatter", "glossary", "text", "numbers", "parity",
    "language", "assets", "input", "hygiene", "pack", "audit", "contract",
)


# I09：新增规则的注册表元数据（全量 ID 见 KNOWN_RULES；--rules-report 输出清单）。
RULE_META = {
    "C01": ("error", "配置/工具故障：术语表未加载或契约不可用；结论不得当作通过"),
    "F10": ("error", "输入文件非法 UTF-8 / U+FFFD / 不可安全读取"),
    "F11": ("error", "法规 frontmatter 残留模板占位 doc_number / source_url"),
    "M12": ("error", "submission.json 字段类型或取值不合法"),
    "M13": ("error", "sourceUrl / URL 形态不合法"),
    "R23": ("error", "法规 submission 与逐语 frontmatter 固定字段不一致"),
    "R24": ("error", "法规中文母版的中文序号必须全角：半角「(一)」一律报错"),
    "S13": ("error", "slug 不符合小写 kebab-case / 3-60 字符"),
    "S14": ("error", "术语契约的译文块数不足，契约无法执行"),
    "H01": ("warning", "工具包目录出现名单外文件（只警告，不删除、不阻断）"),
    "H02": ("warning", "工具包目录出现符号链接 / 越界路径"),
    "P65": ("error", "官方文本的拉丁学名未逐字保留（被音译、改名或抹掉）"),
    "P66": ("error", "中文「我国」被误译成目标语读者本国视角（应为中国）"),
    "P68": ("error", "近缘语言正字法污染：某语向出现另一近缘语言的独有词形"),
    "P69": ("error", "数字日期括注：官方日期后追加 (2026-9-28) 类冗余数字括注（应用本语完整日期形）"),
    "P70": ("error", "阿拉伯句号 U+06D4（۔）只属乌尔都语；ar/fa 等语向出现即错（本语句末用「.」）。已 done 成品的历史存量登记在 baseline 表（rule=P70）只报聚合 warning，新篇一律 error"),
    "P71": ("error", "拉丁变音正字法完整性：整篇无变音 ASCII 转写（21 个拉丁语向）或命中 >=3 个零回归转写词形（es/fr/it/pt）；词表在策略库 lexicons 表（latin-ascii / latin-required）"),
    "P72": ("error", "非英语语向英文紧凑形残词（wks/hrs/yrs、N-day/N-wk、dual-reg 等；en 豁免；扫描前剥离 markdown 链接目标与 references URL）"),
    "P73": ("warning", "半角分号后紧贴非空白（句中分号后应有空格；title+excerpt+正文三层；闭类标点与链接目标/refs URL 放行；全角「；」不在射程）"),
    "P74": ("error", "术语库首选形的两种有证据偏差：词表登记的禁用译法（error）与同篇混用两个被接受形态（warning）；缺失不判"),
    "P75": ("warning", "对立概念被译成同一个词：按词族与「归因」判据比对——对立词形多出来的用量须约等于本概念次数；两族在该语本就合一的整体跳过"),
    "WR01": ("error", "范围声明小节：README 硬规则禁「不覆盖什么 / 本篇不展开」整节"),
    "WR02": ("error", "独立成文：元话语、系列导览与篇间互链（全文唯一链接是文末 CTA）"),
    "WR03": ("error", "二手口径与空泛断言（据说 / strict regulations 一类）"),
    "WR04": ("warning", "清单预告句与 Overview 一类抽象小节标题"),
    "WR05": ("error", "frontmatter references 应为 3–4 条（官方文号与链接）"),
}


# P66 存量豁免：已交付成品按「不追溯」铁律只报 warning，且按条目聚合为
# 存量欠账名单已移入策略库 baseline 表（schema v5）：判据只由「语向 +
# 词类 + 结构」决定，任何判据源码里不再出现篇目 slug。查欠账：
#   python submit.py glossary baseline list
# 清账：改完稿把该行 status 置 closed，不删除行（保留交付痕迹）。


# P70（v2.23）阿拉伯句号语向纯度：U+06D4（۔）是乌尔都语正字法的句末
# 标点，阿拉伯语与波斯语一律用 ASCII「.」。D1 47 语逐语审读（2026-11-09，
# wb-blog-1）复核 ar 摘要时实抓该字符；把这条从「逐篇人工比对」固化为
# 语向级通用判据——全库探针（submission/ 2562 份 mdx）读数：ur 52 份
# 3369 处（合法，唯一允许的语向），ar 6 份 207 处、fa 5 份 143 处
# （同一批次把 RTL 句末统一写成 ۔ 的历史缺陷）。规则按「语向 + 字符」
# 判定，不绑篇目锚点，所有条目/执行人共用；若未来语向表新增信德语/
# 普什图语等合法使用 U+06D4 的语言，须把语码并入 ARABIC_STOP_OK 并留下
# 依据。存量分发在下列 7 篇已 done 成品（D1 同批已修复、不在此列），按
# 「已过审成品不追溯」只登记一条聚合 warning；其余条目一律 error。
ARABIC_STOP = "\u06d4"


ARABIC_STOP_OK = frozenset({"ur"})


# MAX_PACKAGE_FILES / MAX_MEMBER_BYTES：读取前的资源限额（A17/I14）
MAX_PACKAGE_FILES = 5000


MAX_MEMBER_BYTES = 12 * 1024 * 1024


# 汉字数字 → 阿拉伯数字。中文基准用「十四个工作包」这类写法，
# 其他语言用 "fourteen work packages"；做此项归一，两边才可比对。
_CN_DIGITS = {
    "〇": 0, "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
    "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
}


_CN_UNITS = {"十": 10, "百": 100, "千": 1000}


_CN_NUM_RE = re.compile(r"[〇零一二三四五六七八九十百千两]+")


# v2.16：P36 折叠只收「第」前缀的中文序数标识（第…条/款/号/章 → 条文号）。
# 无「第」锚会撞单位词：REG15 zh「每平方千米不少于 3 个」的「千」被 v2.15
# 旧口径当作一千折进 want，47 语全报缺 1000（回归批实测）。数量词（平方
# 千米/千克/千瓦）从不带「第」，法条序数恒带「第」，一锚两断。捕获组只留
# 数词部分——cn_number_to_int 遇未知字符（含「第」）返回 None。
_CN_ORD_RE = re.compile(r"第([〇零一二三四五六七八九十百千两]+)")


_OL_RE = re.compile(r"^\s*(\d+)([.)])\s+")


_UL_RE = re.compile(r"^(\s*)([-*+])\s+")


# 整组匹配：首段 1–3 位 + 一组以上同种分隔符（都接 3 位）。
# 不能写成 `(\d{1,3})[,.](\d{3})` 再循环——折过第一段后 `1234,567`
# 的前一位是数字，`(?<!\d)` 挡住第二折，循环到不动点也到不了 `1234567`。
# 同种分隔符才折：`1,234.567` 只折 `1,234`，保留小数逗号/点的语义。
_TH_GROUP = re.compile(
    r"(?<!\d)(\d{1,3}(?:([,.])\d{3})(?:\2\d{3})*)(?!\d)")


# v1.71：P19 目标侧的分组分隔符比 _fold_thousands 宽——除 , . 外还有
# 空格 / NBSP / 窄 NBSP / 阿拉伯千分位 ٬ / 撇号。只折「1–3 位 + 若干 3 位组」，
# 不碰小数（0.36 的 .36 不是 3 位组）。M2 10 万 → 100.000/100 000/100,000
# 三种写法都要能对上 100000。
_GROUP_SEP_RE = re.compile(
    r"(?<!\d)(\d{1,3})((?:[.,'\u066C\u066B\u00A0\u202F ]\d{3})+)(?!\d)")


# v1.71：P19 数词匹配的语种边界。ja/zh/th 词间不加空格，`(?<!\w)` 会把
# 泰文「คือสิบสี่」判成粘连而漏检（M2 th 缺 14 的假红就是这么来的）；
# 改为子串匹配，再加「构成形守卫」防 24（ยี่สิบสี่／二十四）替 14 顶包。
# 其余语言仍用词边界——拉丁/西里尔/希伯来语等有空格分词，边界是有效判据。
_CN_DIGIT_CHARS = "一二三四五六七八九十百千万亿两〇"


_TH_TENS_PREFIXES = ("ยี่", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า")


_TH_UNIT_WORDS = ("เอ็ด", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า")


_SP_GROUP = re.compile(r"(?<!\d)(\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?!\d)")


# v1.77：整段折叠。旧式 `(\d{1,3})[ ](\d{3})` 每次只折一组，三组空格数
# 「100 000 000」折成「100000 000」后左组变 6 位，\d{1,3} 配 (?<!\d)
# 再也咬不住（C1 fr 实测：got 里留下 000/100000 碎片，100000000 判缺）。
# 新式一次匹配完整分组串再整体去空格；「2018 486」等两个独立数不受影响
# （左组吞不下 4 位数，(?<!\d) 挡住中段起点）。
# v1.53：左界补排除小数点/千分位——「0.43 万亿」的 43 不是「43 万」。
# 旧式 `(?<!\d)` 只挡左邻数字，小数点/逗号放行，于是 43 被读成
# 43 万 ⇒ 母版凭空多出 430000/430（0.6 万亿 → 60000/60），47 语译文的
# 「0.43 trillion」永远判缺，是口径假阳性而非译文缺陷。
_WAN_RE = re.compile(r"(?<![\d.,])(\d+)[ \u00a0\u202f]?[万만]")


# v1.78：亿/億/억同族（ko 억 已在 P19 单位词表），此前 P36 对「1 亿元」
# 是隐形数字——译文写 100,000,000 反成 extra。面组：整值 N*10^8 与
# 百万位读法 N*100（1 亿 = 100 million，数字面 100），raw N 一并授权。
_YI_RE = re.compile(r"(?<![\d.,])(\d+)[ \u00a0\u202f]?[亿億억]")


# P47（v1.52）：母版「N 位」的位数锚。「1476 个 8 位税号」的 8 是一位数字，
# P36/P19 的收数口径都看不见它。
_DIGIT_DESC = re.compile(r"(?<!\d)(\d{1,2})[ \u00a0\u202f]?位")


# 「八」在各语的复合/屈折词干（右开：左边界 + 词干，屈折后缀放行）。
# r79 对账从 144 个锚块实测收集：de achtstellige、ru восьмизначных、
# cs osmimístných、no åttisifrede……裸数词边界匹配抓不到这些形。
# ro 不进词干表——「opt」右开会误中 optimizarea，走双边界词表。
_P47_STEMS = {
    "af": ["agt"], "ar": ["ثمان"], "az": ["səkkiz"], "be": ["васьмі"],
    "bg": ["осем"], "bn": ["আট"], "ca": ["vuit"], "cs": ["osm"],
    "da": ["otte"], "de": ["acht"], "el": ["οκτ"], "en": ["eight"],
    "es": ["ocho"], "fa": ["هشت"], "fi": ["kahdeksan"], "fr": ["huit"],
    "he": ["שמונ"], "hi": ["आठ"], "hr": ["osm"], "hu": ["nyolc"],
    "hy": ["ութ"], "id": ["delapan"], "it": ["otto"], "ja": ["八"],
    "ka": ["რვა"], "ko": ["팔"], "ms": ["lapan"], "ne": ["आठ"],
    "nl": ["acht"], "no": ["ått"], "pl": ["ośmi"], "pt": ["oito"],
    "ru": ["восьми"], "si": ["අට"], "sk": ["osem"],
    "sl": ["osm", "osem"], "sq": ["tetë"], "sr": ["осм", "осам"],
    "sv": ["ått"], "sw": ["nane"], "ta": ["எட்டு"], "th": ["แปด"],
    "tr": ["sekiz"], "uk": ["восьми"], "ur": ["آٹھ"], "vi": ["tám"],
}


_P47_WORDS = {"ro": ["opt"]}


# 无空格文字（th/ja）词间不设界，左边界失灵，词干免边界匹配。
_P47_FREE_STEM = {"th", "ja"}


_BAN_SPACELESS = frozenset("zh ja th".split())   # 连续书写、词间无空格的语种


# v1.59 P21/P26 结构错位根因探测（REG1 首轮 173 error 中约四分之三是这三类
# 根因的连锁反应：孤儿块 → P26/P21-P23/P36 全线错位）。判据不变，只在报错
# 文本尾部附提示，把逐块人工比对缩到一步。
_BLOCK_MISALIGN_ORPHAN_RE = re.compile(
    r"(?m)^\*\*[^*\n]+\*\*[ \t\u00a0\u3000]*\r?\n\r?\n")


_BLOCK_MISALIGN_H2_RE = re.compile(r"(?m)^## [^\n]+\r?\n[^\r\n#>-]")


_BLOCK_MISALIGN_ORPHAN_HINT = (
    "检测到加粗标记行后紧跟空行（条文号孤儿块，行尾 NBSP/全角空格尾随常见）——"
    "标记行应与内容合并为同一块")


_BLOCK_MISALIGN_NUM_HINT = (
    "开场段以「数字. 」开头会被识别为有序列表——自然语段落请改以词语开头")


_BLOCK_MISALIGN_H2_HINT = "检测到 H2 标题与正文之间缺空行（粘连成块）"


# 块大纲各维度的中文标签。**插件按名字定位维度**（`parity-inline-emphasis.py`
# 用 `labels.index(lab)` 找「加粗数」在第几位），所以这些字符串是跨文件的键：
# 表里改名、插件里没改，插件的 `if lab not in labels: continue` 会让整条规则
# **静默跳过**——P26 从此零命中，而机检全绿。两边只能共用一份常量。
LBL_LEVEL = "标题层级"
LBL_ITEMS = "条目数"
LBL_MARKERS = "列表符号"
LBL_INDENTS = "缩进层级"
LBL_BOLD = "加粗数"
LBL_ITALIC = "斜体数"
LBL_CODE = "行内代码数"
LBL_ITEM_BOLD = "逐项加粗分布"
LBL_ROWS = "行数"
LBL_COLS = "列数"
LBL_ROW_COLS = "各行列数"
LBL_QUOTE_LINES = "引用行数"
LBL_CODE_LINES = "代码行数"
LBL_FILENAME = "文件名"
LBL_ALT = "alt 是否存在"
LBL_LINK = "链接目标"
LBL_PARA_LINES = "段内换行数"

# 每个块类型的 detail 元组，各维度的中文标签。**顺序必须与
# `core.textutil.block_outline` 里 detail 元组的顺序逐一对应**——
# `selftest/_outline_labels.py` 用真实探针体钉住位置（标签数、以及
# bold/italic/code 各在第几位）。
_DETAIL_LABELS = {
    "H2": (LBL_LEVEL, LBL_BOLD, LBL_ITALIC, LBL_CODE),
    "H3": (LBL_LEVEL, LBL_BOLD, LBL_ITALIC, LBL_CODE),
    "H4": (LBL_LEVEL, LBL_BOLD, LBL_ITALIC, LBL_CODE),
    "LIST": (LBL_ITEMS, LBL_MARKERS, LBL_INDENTS, LBL_BOLD, LBL_ITALIC,
             LBL_CODE, LBL_ITEM_BOLD),
    "TABLE": (LBL_ROWS, LBL_COLS, LBL_ROW_COLS, LBL_BOLD, LBL_ITALIC, LBL_CODE),
    "QUOTE": (LBL_QUOTE_LINES, LBL_BOLD, LBL_ITALIC, LBL_CODE),
    "CODE": (LBL_CODE_LINES,),
    "IMG": (LBL_FILENAME, LBL_ALT, LBL_LINK),
    "PARA": (LBL_BOLD, LBL_ITALIC, LBL_CODE, LBL_LINK, LBL_PARA_LINES),
}


# ---------------------------------------------------------------- WR 通用写作纪律
# 词表唯一来源 = data/glossary.db 的 writing 段契约；此函数只读契约，不硬编码
# 任何禁用词形。后续任何人补一条 glossary add --section writing 即对所有篇生效。
WR_MD_LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")


# P57（v1.74）数字格式：同一语种内小数点与千分位必须统一。
# 依据各语种出版规范：33 语用小数逗号，其余用小数点；千分位按语种取
# 空格 / 点 / 逗号。A1 审读实测：r1 在 de/nl/es/pt 等语混用 9.1 与 9,1、
# 5,000 与 5.000，P04/P55 都放行（NUM_SEP 两者都收），只有逐语一致性
# 能抓——因此单列 P57，按 warning 报（排版问题，不阻断打包）。
P57_DECIMAL_COMMA = frozenset(
    "af az be bg ca cs da de el es fi fr hr hu hy id it ka ms nl no pl pt ro "
    "ru sk sl sq sr sv tr uk vi".split())


P57_THOUSANDS = {}


P57_THOU_RE = re.compile(r"(?<![\d.,])\d{1,3}([ .,\u00A0\u202F])\d{3}(?!\d)")


P57_DEC_RE = re.compile(r"(?<![\d.,])\d{1,2}([.,])\d{1,2}(?![\d.,])")


# P57（v2.20）官方条款编号「第 8.8 条」是**标识符**，不是小数：本地化成
# 8,8 会破坏条款可检索性。由 zh 母版逐篇动态提取，不写死任何篇目/编号。
# REG21（93 号莱索托羊毛）首检 33 语 P57 假阳全部来自《陆生动物卫生法典》
# 第 8.8 条；真小数（9,1 之类）仍按 P57_DECIMAL_COMMA 正常判。
_P57_CLAUSE_RE = re.compile(r"第\s*(\d+(?:[.,]\d+)+)\s*条")


ENTRY_WHITELIST = ("work", "preview_zh.html")


# --- P38（v1.37）孟加拉文裸辅音 + CANDRABINDU ----------------------------
# 判据依据、分母自证与射程声明写在 docstring【v1.37】，这里只留口径本身。
BN_CANDRABINDU = chr(0x981)        # CANDRABINDU：标前一元音的鼻化


BN_CONSONANT_LO = (0x0995, 0x09B9)  # ক..হ 裸辅音字母（category Lo）


# 空表＝当前无豁免。每条豁免都是盲区入口：加条目之前必须先在语料里证明该词形
# 真出现、且属合法异形，并把它写进电池的正/负对照两格里（否则豁免机制本身
# 就是一张没人验过的空白通行证）。
BN_CB_ALLOW = ()


__all__ = ['LBL_ALT', 'LBL_BOLD', 'LBL_CODE', 'LBL_CODE_LINES', 'LBL_COLS', 'LBL_FILENAME', 'LBL_INDENTS', 'LBL_ITEM_BOLD', 'LBL_ITEMS', 'LBL_ITALIC', 'LBL_LEVEL', 'LBL_LINK', 'LBL_MARKERS', 'LBL_PARA_LINES', 'LBL_QUOTE_LINES', 'LBL_ROW_COLS', 'LBL_ROWS', 'ARABIC_STOP', 'ARABIC_STOP_OK', 'BN_CANDRABINDU', 'BN_CB_ALLOW', 'BN_CONSONANT_LO', 'CORE_RULES', 'ENTRY_WHITELIST', 'FULLWIDTH_PUNCT_RE', 'KNOWN_RULES', 'MAX_MEMBER_BYTES', 'MAX_PACKAGE_FILES', 'P57_DECIMAL_COMMA', 'P57_DEC_RE', 'P57_THOUSANDS', 'P57_THOU_RE', 'PLUGIN_CATEGORIES', 'RULE_META', 'WR_MD_LINK_RE', '_BAN_SPACELESS', '_BLOCK_MISALIGN_H2_HINT', '_BLOCK_MISALIGN_H2_RE', '_BLOCK_MISALIGN_NUM_HINT', '_BLOCK_MISALIGN_ORPHAN_HINT', '_BLOCK_MISALIGN_ORPHAN_RE', '_CN_DIGITS', '_CN_DIGIT_CHARS', '_CN_NUM_RE', '_CN_ORD_RE', '_CN_UNITS', '_DETAIL_LABELS', '_DIGIT_DESC', '_GROUP_SEP_RE', '_OL_RE', '_P47_FREE_STEM', '_P47_STEMS', '_P47_WORDS', '_P57_CLAUSE_RE', '_SP_GROUP', '_TH_GROUP', '_TH_TENS_PREFIXES', '_TH_UNIT_WORDS', '_UL_RE', '_WAN_RE', '_YI_RE']
