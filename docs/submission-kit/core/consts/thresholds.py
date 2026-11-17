# -*- coding: utf-8 -*-
"""core.consts.thresholds — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

W02_EXPANSION_DENSE = 4.0


# P71（拉丁变音正字法）两条门槛：
#   MIN_LATIN_LETTERS     整篇臂的分母下限——正文 ASCII 字母不足 200 时样本太小，
#                         不判「整篇无变音」（短摘要/短公告会假红）。
#   ASCII_FORMS_DISTINCT  词表臂的「不同转写词形」个数门槛——es 的 publico/aun/ira
#                         本身是合法同形词，单个命中不足以定性；3 个不同形是
#                         全库 2698 份存量探针给出的零回归口径。
LATIN_DIACRITIC_MIN_LETTERS = 200
LATIN_ASCII_FORMS_MIN_DISTINCT = 3


MAX_IMAGES_WARN = 6


# P67（v2.19）富字段列表块跨语向压缩离群。
# W02 只判「过长」，P21–P26 只判条目数/标记/强调/几何，P19 只判数字——
# 一个多行台账块每行被压成「编号 + 时间 + 结论」、整层文字字段消失时，
# 块数、条目数、标记、数字全对齐，机检全绿。C4 的 th b13/b27 实证：
# 六行台账只剩 1.0 字段/行，其余 46 语 6.0–7.0，块长仅为 zh 的 0.845 倍。
# 阈值来自 50 个存量条目零误伤试算（tmp/p67_probe.py），双闸缺一不可：
# 绝对闸挡住「译文比高度浓缩的中文母版还短」，相对闸挡住某语系天然紧凑。
P67_FIELD_SEPS = "，,、；;：:|·"


P67_MIN_ROWS = 3          # 至少三行才算台账/清单，避开普通短列表


P67_MIN_FIELD_DENSITY = 2.0   # zh 块每行平均分隔符数，低于此不进候选


P67_ABS_RATIO = 1.0       # 译文块长 / zh 块长 不得小于 1


P67_REL_RATIO = 0.45      # 且不得小于同块各语中位数的 45%


P67_MIN_ALIGNED = 10      # 少于 10 语与母版块数对齐时不判（起手阶段不噪声）


# I09（v9）：配图文件名要能承载检索词（SEO）。站方把图片路径写进页面，
# `fig-01.webp` 这类纯序号对搜索没有任何信息量；要求小写 kebab-case、
# 至少两段、≥8 字符。cover.webp 是列表卡片与社交分享的固定契约，不参与。
IMAGE_NAME_SEO_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)+$")


IMAGE_NAME_BAD_RE = re.compile(
    r"^(?:fig(?:ure)?[-_]?\d+|img[-_]?\d+|image[-_]?\d+|pic[-_]?\d+"
    r"|photo[-_]?\d+|\d+|untitled|dsc[-_]?\d+)$")


# 存量欠账名单已移入策略库 baseline 表（schema v5）：判据只由「语向 +
# 词类 + 结构」决定，任何判据源码里不再出现篇目 slug。查欠账：
#   python submit.py glossary baseline list
# 清账：改完稿把该行 status 置 closed，不删除行（保留交付痕迹）。


SIMILARITY_LIMIT = 0.95


# F03 标题分隔符（v1.41）：只禁「作分隔用」的形状，词内连字符放行。
# 连字符族（含非断行连字符/小连字符）＝词内合法；en/figure dash 与减号
# ＝只放行数字或编号区间；em dash/横线/全角连字符＝任何位置都禁。
# 亚美尼亚 ֊（U+058A）、希伯来 ־（U+05BE）等文字系统自带的词内连字符
# 不在这些集合里，刻意不碰。
TITLE_COLONS = ":\uff1a"


TITLE_HYPHENS = "-\u2010\u2011\ufe63"


TITLE_RANGE_DASHES = "\u2012\u2013"


TITLE_MINUS_SIGNS = "\u2212"


TITLE_BAR_DASHES = "\u2014\u2015\uff0d"


SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", ".svg"}


ALLOWED_SUFFIX = {".mdx", ".webp", ".json"}


_REG_PUNCT_GROUPS = [
    ("paren", "()（）\[\]【】{}｛｝"),
    ("quote", "\"\u201c\u201d\u201e\u2018\u2019\u00ab\u00bb'`"),
    ("book", "《》〈〉「」『』"),
    ("colon", ":："),
    ("comma", ",，"),
    ("stop", ".。"),
    ("semi", ";；"),
    ("quest", "?？"),
    ("excl", "!！"),
    ("dash", "\u2014\u2013\u2015\u2212-"),
    ("slash", "/／"),
    ("bar", "|｜"),
    ("eq", "=＝"),
]


SCRIPT_TESTS = {
    "ar": r"[\u0600-\u06FF]", "fa": r"[\u0600-\u06FF]", "ur": r"[\u0600-\u06FF]",
    "he": r"[\u0590-\u05FF]",
    "hi": r"[\u0900-\u097F]", "ne": r"[\u0900-\u097F]",
    "bn": r"[\u0980-\u09FF]",
    "ta": r"[\u0B80-\u0BFF]",
    "th": r"[\u0E00-\u0E7F]",
    "ka": r"[\u10A0-\u10FF]",
    "hy": r"[\u0530-\u058F]",
    "el": r"[\u0370-\u03FF]",
    "ru": r"[\u0400-\u04FF]", "uk": r"[\u0400-\u04FF]", "be": r"[\u0400-\u04FF]",
    "bg": r"[\u0400-\u04FF]", "sr": r"[\u0400-\u04FF]",
    "ja": r"[\u3040-\u30FF]",
    "ko": r"[\uAC00-\uD7AF]",
    "si": r"[\u0D80-\u0DFF]",
    "zh": r"[\u4E00-\u9FFF]",
}


CJK_LANGS = {"zh", "ja", "ko"}


# 同样「单字成词」的语言：字符数比词数更接近阅读负担，
# 超长段落判定使用更紧的阈值（见 MAX_PARAGRAPH_CHARS_CJK）。
DENSE_SCRIPT_LANGS = CJK_LANGS | {"th", "my", "km", "lo"}


# L09（v1.78）日文正字：以下简体中文字形不是日文新字体，正常日文文本不会出现。
# 2026-10-31 A2 审计实证：ja 摘要把「四层」写成简体「层」（日文应为「四層」），
# L03/L04 都放行。只登记「简体专用、日文不用」的字，避开中日共用的新字体
# （国/学/体/数/台/号/万/与/点 等），避免把合法日文判红。
JA_SIMPLIFIED_ONLY = (
    "层关货单报检网购销张华门问题见东车马鱼鸟龙龟发齐说读员团园图场"
    "长银钱贸电话讲认实证际规则页经济营业应这为无亿币额价汉语"
    "军农产业务处备标记种类别样线级约给结统继续维织带"
    "构设计划调节术权义责进监费汇"
)


# 使用非拉丁文字系统的语言。这类语言正文里出现拉丁字母词，基本就是
# 英文原词残留（本族词不会写成拉丁字母）；拉丁字母语言不适用此判断。
NON_LATIN_SCRIPT_LANGS = {
    "ar", "fa", "ur", "he",           # 阿拉伯/波斯/乌尔都/希伯来
    "ru", "uk", "be", "bg", "sr",     # 西里尔
    "el",                              # 希腊
    "hi", "ne", "bn", "ta", "si",      # 天城文/孟加拉/泰米尔/僧伽罗
    "th", "my", "km", "lo",            # 泰/缅/高棉/老挝
    "ka", "hy",                        # 格鲁吉亚/亚美尼亚
    "zh", "ja", "ko",                  # 中日韩
}


# v2.12 已登记的罗马节序号（REG15 bn «(vi)-এর» 等本地格后缀）。
# 只允许这些已登记的短词，不放开任意 1–2 字母拉丁片段。
_LATIN_ROMAN_SEQ = frozenset(
    "i ii iii iv v vi vii viii ix x xi xii".split())


# 拉丁词边界：Python 的 `\b` 在 CJK 与拉丁之间不成立（两者都是 \w），
# `Septoria albopunctata` 紧接中文时会被切成 `lbopunctata`——首字母丢失后
# 既查不到词表也匹配不上跨语向一致串（REG9 实测 21 语向假阳）。这里改用
# 「前后不是 ASCII 字母」的边界，CJK 紧邻拉丁仍算一个完整拉丁词。
_LATIN_WORD_RE = re.compile(r"(?<![A-Za-z])[A-Za-z][A-Za-z\-']{2,}(?![A-Za-z])")


# v1.43：单次出现也拦的疑英文残留词（登记制，加词须附实证）。
# 门槛 ≥2 的盲区：el 正文单次 brands 直到第二轮改稿引入第二处才暴露。
# 这些词是普通英文内容词，在任何受监控非拉丁文字正文里出现即属夹用。
LATIN_SINGLE_SUSPECT = {
    "brands", "brand", "health", "wellness", "supplement", "supplements",
}


__all__ = ['ALLOWED_SUFFIX', 'LATIN_ASCII_FORMS_MIN_DISTINCT', 'LATIN_DIACRITIC_MIN_LETTERS', 'CJK_LANGS', 'DENSE_SCRIPT_LANGS', 'IMAGE_EXTS', 'IMAGE_NAME_BAD_RE', 'IMAGE_NAME_SEO_RE', 'JA_SIMPLIFIED_ONLY', 'LATIN_SINGLE_SUSPECT', 'MAX_IMAGES_WARN', 'NON_LATIN_SCRIPT_LANGS', 'P67_ABS_RATIO', 'P67_FIELD_SEPS', 'P67_MIN_ALIGNED', 'P67_MIN_FIELD_DENSITY', 'P67_MIN_ROWS', 'P67_REL_RATIO', 'SCRIPT_TESTS', 'SIMILARITY_LIMIT', 'SLUG_RE', 'TITLE_BAR_DASHES', 'TITLE_COLONS', 'TITLE_HYPHENS', 'TITLE_MINUS_SIGNS', 'TITLE_RANGE_DASHES', 'W02_EXPANSION_DENSE', '_LATIN_ROMAN_SEQ', '_LATIN_WORD_RE', '_REG_PUNCT_GROUPS']
