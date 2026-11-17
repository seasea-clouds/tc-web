# -*- coding: utf-8 -*-
"""core.consts.text_patterns — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

# M2（2026-10-29）实证：八种语言的「逐一/分步」重叠习语是翻译的自然生成物，
# 首轮 48 语就出现 10 处（ar/bn/el/he/si/sw/tr/ur），改稿词形已逐一验证。
# 把改写词形挂进 P10 报错信息——报错即给改法，不必回查会话记忆。
# 白名单纪律不变：能改写的一律改稿，不扩 REDUPLICATION_OK（与 v1.58 收口批
# 「he/si/sw/ur 的逐一形本轮一律改稿」同一口径）。
# 注意射程：P10 扫 bare 正文（图片/链接连 alt 一起剥离，防 RTL 假 token），
# alt 文本里的重叠不在射程——F2/M1 的 si 图注各有 1 处 එක් එක් 残留，属
# 已知射程外存量；且 එක් එක්＋名词＝「每个」是限定词正字法，故 si 不入
# banned（准入预扫旧形非 0，全局禁用会判红已验收包），只在本表提示改写。
REDUPLICATION_REWRITE_HINT = {
    "ar": "تباعاً / واحدة تلو الأخرى",
    "bn": "ক্রমান্বয়ে / একের পর এক",
    "el": "διαδοχικά",
    "he": "בזה אחר זה",
    "si": "එකිනෙකාට වෙන්ව（副词用法；එක් එක්＋名词＝每个，限定词用法合法）",
    "sw": "moja kwa moja",
    "tr": "kademeli olarak",
    "ur": "ایک کے بعد ایک",
}


# v1.43 P45 称呼语域混用：同一文件内非尊/尊第二人称标记并存。
# 实证缺陷：hu te/Ön 断裂、ro să te miști vs 块31 rezolvați、ca moure't vs
# vosaltres（F2 r6、F3 r2 各修过）。只收单侧无歧义的代词/物主限定词；
# 动词形态不在射程；北欧语不收（CTA 末块复数切换是既定约定）。
# de/it 的尊形标记大小写敏感（Sie/Lei），勿改小写。
REGISTER_MARKERS = {
    "hu": (re.compile(r"\b(?:te|téged|neked|magad)\b"),
           re.compile(r"\b(?:Ön|Önt|önnek|önök|maguk)\b")),
    "ro": (re.compile(r"\b(?:tu|tine|ție|tău|tăi|tale|ta)\b"),
           re.compile(r"\b(?:dumneavoastră|dumneata|voastră|voștri)\b")),
    "ca": (re.compile(r"\b(?:tu|et|teu|teva|teus|teves)\b|\bt'[a-zàéíóúïüç·]+|\w+'t\b"),
           re.compile(r"\b(?:vostè|vostes|vostre|vostres)\b")),
    "fr": (re.compile(r"\b(?:tu|te|tes|ton|ta|toi)\b"),
           re.compile(r"\b(?:vous|votre|vos)\b")),
    "es": (re.compile(r"\b(?:tú|ti|tu|tus|te)\b"),
           re.compile(r"\b(?:usted|ustedes)\b")),
    "de": (re.compile(r"\b(?:du|dich|dir|dein|deine|deinen|deinem|deiner)\b"),
           re.compile(r"\b(?:Sie|Ihnen)\b")),
    "it": (re.compile(r"\b(?:tu|ti|te|tuo|tua|tuoi|tue)\b"),
           re.compile(r"\b(?:Lei|Loro)\b")),
    "el": (re.compile(r"\b(?:εσύ|εσένα|εσέναν|σου)\b"),
           re.compile(r"\b(?:εσείς|εσάς|σας)\b")),
    "pt": (re.compile(r"\b(?:tu|ti|teu|tua|teus|tuas)\b"),
           re.compile(r"\b(?:vocês?|seus?)\b")),
}


CTA_COLON_RE = re.compile(r"[:：]\s*\[[^\]]+\]\([^)]*/packages/")


# v1.4：隐形/零宽字符（P14）。ZWNJ 在波斯/乌尔都/阿拉伯语是正字法，ZWJ 在僧伽罗/
# 天城文/孟加拉/泰米尔等用于合字，按语言白名单放行；其余一律视为编辑器残留
INVISIBLE_ALWAYS = {
    "\u00ad": "SOFT-HYPHEN", "\u200b": "ZWSP", "\ufeff": "BOM",
    "\u2060": "WORD-JOINER", "\ufffd": "REPLACEMENT-CHAR",
    "\u200e": "LRM", "\u200f": "RLM", "\u202a": "LRE", "\u202b": "RLE",
    "\u202c": "PDF", "\u202d": "LRO", "\u202e": "RLO",
}


ZWNJ_OK_LANGS = {"fa", "ur", "ar", "ps"}


ZWJ_OK_LANGS = {"si", "hi", "bn", "ta", "ne", "ka", "th"}


SPACE_PUNCT_RE = re.compile(r"(?<![0-9])[ \t]+[,.]")


DUP_SENT_SPLIT_RE = re.compile(r"(?<=[.!?。！？])\s+")


# v1.5：跨语言事实一致性（P19 的提取口径与阈值）
DOC_NUMBER_MIN = 10


DOC_NUMBER_YEAR_MIN = 1900


DOC_NUMBER_YEAR_MAX = 2100


IMG_REF_RE = r"/images/blog/%s/([\w.\-]+\.webp)"


# markdown 图片/链接占位符（NUL 字符：非 \w 非 \S 语义干扰最小）
_MD_PH = "\x00\x00"


_CODE_PART_RE = re.compile(r"^(?:[A-Za-z]?\d{1,4}|[A-Z]{2,3})$")


# v1.71：中文计数单位归一。母版写「10 万」，译文写 100,000 是正常换算，
# P19 只收阿拉伯数字时会把 10 当成事实、再把 100,000 判成缺失（M2 47 语
# 实测 41 条假红）。这里把「整数 + 万/亿/万亿」先换成等值整数再取事实；
# 只处理整数，小数（0.36–0.43 万亿）仍交给 P04/P55 的小数口径。
# 前视/后视只挡数字与小数点，不挡字母：日文「約10万人」的 10 紧跟前字
# 「で」「約」，用 \w 会把整个单位匹配挡掉，转而把 10 当事实、100000 判缺。
# 10^12 的中文写法。**单独一个常量**，因为除了这里的两处（正则、倍率表），
# P48 还拿它当触发条件判「母版这一块是否在讲万亿级数字」。三处各写一遍的话，
# 改一处漏一处就是 P48 静默零命中——而机检照样满分绿。
CN_UNIT_TRILLION = "万亿"

_CN_UNIT_RE = re.compile(r"(?<![\d.,])(\d+)\s*(%s|亿|億|万)" % CN_UNIT_TRILLION)


_CN_UNIT_MULT = {CN_UNIT_TRILLION: 10 ** 12, "亿": 10 ** 8, "億": 10 ** 8,
                 "万": 10 ** 4}


# 术语词形的边界策略。**这是「这门语言怎么写词」，不是「我们要判什么」**——
# 所以住 consts 而不进词库。
#   letter    词由空格分隔，字母连写即一个词 → 前后不许是字母（默认，拉丁/西里尔等）
#   script    汉字/片假名词，词界由「同文字连写」决定：假名是语法胶水，可以紧贴
#             （ja「申告する」里的 申告 必须命中，「関税庁」里的 関税 不算命中）
#   spaceless 没有词间距（th），边界无从谈起，只能子串
# 由来：P74 原先一律用 `[^\W\d_]`，ja 里「申告」语料出现 344 次、判据一次也
# 没看见——汉字词前面常是假名（の/は/を），全被当成词内。实测 ja 92%、
# th 92% 的出现被判据漏掉，而机检显示 P74 零命中。
TERM_BOUNDARY = {"ja": "script", "zh": "script", "th": "spaceless",
                 "ko": "particle"}


# 韩语助词/格标记：贴着名词写，字母边界会把「관세청은」判成词内而不是「관세청」。
# 闭类（十几项，不会长），所以列全；匹配时作为可选后缀，后界仍要求不是字母。
# 实测：ko 术语命中 2702 → 4190（+55%），且有 0 个词形原本完全漏掉——
# 说明这不是「某个词写错」，而是**每次带助词的出现都看不见**。
KO_PARTICLES = ("은", "는", "이", "가", "을", "를", "의", "에", "에서",
                "으로", "로", "과", "와", "도", "만", "까지", "부터",
                "에는", "에서는")


# v1.71：目标语同样会用「数词 + 单位词」写十万级数——ko「10만 명」、
# az「100 min」、tr「100 bin」、ka「100 ათასი」。母版「10 万」换算成
# 100,000 时，这几种写法与 100,000 等价，不能判成缺失（F4 实证 4 条）。
# 只登记已实证的单位词，不收整类（min/bin 在各自语言分别是
# 「千」，不是英文残留；아래 词条右边界挡住 minimum 等误中）。
_UNIT_WORD_RE = re.compile(
    r"(?<![\w.])(\d+)\s*(만|억|조|min|bin|ათასი|ათას)(?!\w)", re.I)


_UNIT_WORD_MULT = {
    "만": 10 ** 4, "억": 10 ** 8, "조": 10 ** 12,
    "min": 10 ** 3, "bin": 10 ** 3, "ათასი": 10 ** 3, "ათას": 10 ** 3,
}


# 句首＝行首，或跟在句末标点／冒号／列表标记／引号之后
_ST8_EDGE_RE = re.compile(
    r"(?:^|[\n.!?։।۔؟:;؛：—–])\s*(?:[-*>#\d.)\]]\s*)*[\"'“”‘’«»「『\[(*]*\s*$")


_ST8_QUOTE_PAIRS = (("“", "”"), ("「", "」"), ("『", "』"), ("«", "»"),
                    ('"', '"'), ("\"", "\""))


# v1.71：句首套话的**缺陷形状**是「填充语」——开场词后立刻收标点
# （"Kesimpulannya, …"／"Závěrem:"），词本身不携带内容。若开场词后
# 紧跟实义词（id「Kesimpulannya lebih dulu: 先给结论」），它是句子的
# 正常主语/状语，不是套话。M1 id 开头就是这个形状，旧判据误报。
_ST8_FILLER_AFTER_RE = re.compile(r"^[ \t]*[,，:：;；.。!?！？—–-]")


# ---------------------------------------------------------------- P63（v2.06）引号跨族配对
# 判据与边界口径见 check() 内 P63 注释与文件头 changelog【v2.06】。
# „ 的本位闭引号分语种两族，与 P60 v2.03 全库计量裁决同表：
#   de 族 „…“（U+201C）＝bg/cs/de/ka/nl/sk/sl/sq（repo 全 U+201C）；
#   „…”（U+201D）＝pl/ro/hu/hr/sr/da/no（波罗的-罗-匈-克-塞-北）。
# 【v2.07】sr 实证为双族并存：REG3 7 对 „…”，REG5–REG12 共 67 对 „…“。
# P60 保留 sr 在 U+201D 本位组（移走会判红已交付的 REG3），另加
# 「同篇混用两族」判据——单族篇内一致即合法。两表口径保持一致。
# sv/fi/da/no/is 的 ” 本位可开可闭；' ’ 撇号不入表；不成对（栈不空收尾）
# 不判——v1.97 已实测否掉「引号不成对」尺。
_P63_NATIVE_U201D = frozenset("pl ro hu hr sr da no".split())


_P63_STR_OPEN = frozenset("sv fi da no is".split())


_P63_OPEN = {
    "\u201e": "\u201c",   # „ → “（U+201D 本位语种见上表另放行 ”）
    "\u00ab": "\u00bb",   # « → »
    "\u300c": "\u300d",   # 「 → 」
    "\u300e": "\u300f",   # 『 → 』
}


# P08 拉丁代号＋本地词尾／前附连接词（v1.58）。v1.14 只放行带连字符的一侧
# （S1-ից、ל-US、blue hat-ის），但波斯语与阿拉伯语的正字法本来就是**直接黏着**：
# 「SKUها／SKUهای」（复数）、「C-ով」（亚美尼亚语工具格）、阿拉伯语连接词 و 必须
# 前粘（「وS3」）。这些不是漏改，是外来缩写在目标语里正常变形。
# 判据收紧在两点：① 拉丁侧必须是**全大写缩写/编号/单字母代号**（SKU、S3、C、P0），
# 小写英文词＋本地词尾（marketها、compliance-ով）照旧判红——那才是 P08 要抓的形状；
# ② 本地侧必须命中登记录在案的词尾/前附形，不接受任意非拉丁串。
P08_ACRONYM_RE = re.compile(r"^[A-Z][A-Z0-9]{0,5}$")


P08_LOCAL_SUFFIX = {
    "fa": ("های", "ها", "ی", "تر", "ترین", "ام", "ایت"),
    "ar": ("ات", "ين", "ة", "ها"),
    "hy": ("ով", "ի", "ում", "եր", "ան", "ովի", "ն"),
    "ka": ("ის", "მა", "ში", "ზე", "ს"),
    # v1.71：M3 四路对比把两条路记作 A/B，孟加拉语属格直接黏着
    # （A-এর / A-র），泰米尔语宾格黏着（B-ஐ）——都是正字法，不是漏改。
    "bn": ("এর", "র"),
    "ta": ("ஐ",),
}


P08_LOCAL_PREFIX = {
    "ar": ("و", "ال", "بال", "وال", "ف", "ب", "ل", "ال"),
    # v1.71：希伯来语介词/关系词前附（מ-B「从 B」、ש-A「A 所…」）
    "he": ("ל", "ב", "ו", "ה", "של", "מ", "ש"),
}


__all__ = ['CN_UNIT_TRILLION', 'CTA_COLON_RE', 'DOC_NUMBER_MIN', 'DOC_NUMBER_YEAR_MAX', 'DOC_NUMBER_YEAR_MIN', 'DUP_SENT_SPLIT_RE', 'IMG_REF_RE', 'INVISIBLE_ALWAYS', 'P08_ACRONYM_RE', 'P08_LOCAL_PREFIX', 'P08_LOCAL_SUFFIX', 'REDUPLICATION_REWRITE_HINT', 'REGISTER_MARKERS', 'SPACE_PUNCT_RE', 'KO_PARTICLES', 'TERM_BOUNDARY', 'ZWJ_OK_LANGS', 'ZWNJ_OK_LANGS', '_CN_UNIT_MULT', '_CN_UNIT_RE', '_CODE_PART_RE', '_MD_PH', '_P63_NATIVE_U201D', '_P63_OPEN', '_P63_STR_OPEN', '_ST8_EDGE_RE', '_ST8_FILLER_AFTER_RE', '_ST8_QUOTE_PAIRS', '_UNIT_WORD_MULT', '_UNIT_WORD_RE']
