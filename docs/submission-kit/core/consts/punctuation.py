# -*- coding: utf-8 -*-
"""core.consts.punctuation — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re
from .rules import (P57_THOUSANDS)

# --- P40（v1.39）摘要终止标点 -------------------------------------------
# 允许的句末标点：拉丁/中日韩句号、感叹号/问号（半角+全角）、天城文 danda、
# 阿拉伯文句号、亚美尼亚句号、省略号、阿拉伯/乌尔都问号。
# v2.04：+ ෴（U+0DF4 僧伽罗kundaliya）——si 本土句末标点（站方体例 si 正文
# 全篇用 ෴，v1.39 清单漏收；REG12 si excerpt 实锤 1 处）。
EXCERPT_TERMINAL = frozenset(".。！？!?।۔։…؟෴")


# 收尾引号/括号不属于句子内容：摘要末尾的 "…brand's." / 「…」/ (…) 先剥再判。
EXCERPT_CLOSERS = "\"'”’»›)]）】」』》>"


P41_LIST_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$")


P41_LABEL_SEP_RE = re.compile(r"\s*[:：՝]\s*")


# --- P42（v1.42）亚美尼亚文 ASCII 句点 --------------------------------
# hy 的句末是 ։（U+0589），缩写 թվական 写「թ.」；正文里 ASCII "." 只剩
# 小数、文件名/URL、代码三种合法来源。r5 全量修了 P0/F1/F2 共 221 处
# ASCII 句点（其余命中全是这些豁免形）。掩码按等长空白替换，保留行号。
P42_MDLINK_DEST_RE = re.compile(r"(?<=\])\([^)]*\)")


P42_URL_RE = re.compile(r"https?://\S+")


P42_CODE_RE = re.compile(r"`[^`\n]*`")


P42_DECIMAL_RE = re.compile(r"\d\.\d")


P42_TH_RE = re.compile(r"(?<!\S)թ\.(?=\s|\d|$)")


# v1.87：引语收尾句点掩码——hy 正文引用英文原句（附加声明/协议原文）时，
# 句点在拉丁字母后紧跟引号收尾（…concerned to China.»）属引语正字法，
# 不是亚美尼亚句末误写（REG8 hy 实证）。只掩「拉丁字母+句点+引号收尾」，
# 亚美尼亚句末误写（亚美尼亚字母后的句点）不受影响。
P42_LATIN_QUOTE_RE = re.compile(r"(?<=[A-Za-z])\.(?=»|\"|”|’|')")


# v1.90：学名缩写点掩码——林奈缩写正字法（属名缩写 D.、命名人 L.、
# 种级归属 spp./sp./subsp./var./cf./ssp.）的 ASCII 句点是学名不可拆改的
# 一部分（REG9 实证：Diaporthe spp.（D. eres、D. rudis）、Vaccinium L.
# 在 hy 触发 4 处）。只掩「词边界缩写+句点+非字母收尾」，普通单词句末
# （字母+句点+空格+字母）不受影响。
# v2.26：补小写 f.（forma，forma specialis 的标准缩写）。REG24（109 号缅甸
# 香蕉）B15 学名 Fusarium oxysporum Schlecht f. sp. cubense Race 4 在 hy
# 触发 P42——f. 是种下型等级的不可拆缩写（P65 同时要求逐字保留）。
# (?<![A-Za-z]) 保证 of./if. 一类以 f 结尾的普通词不受影响。
# v2.26（REG28 回流）：官方拉丁学名的**命名人缩写点**不是句末标记。
# P58 的 ≤3 字母启发式吃不到 4+ 字母缩写（Merr./Roxb./Lour./Karst.），
# P42 旧 TAXON 正则只收 [A-Z]|sp|var，导致 REG28 34 语 P58 + hy 67 处
# P42 假红。按「缺陷族」整族登记、跨篇复用；后续发现新缩写按族追加。
LATIN_TAXON_AUTHOR_ABBR = frozenset(
    "bl carr cham coll fort fr franch gaertn gagnep hand hemsl hook karst koidz kurt leyss lindl lour mazz merr mill miq pierre red rehd retz rosc roxb schw sm spreng thunb val vent wils".split())
_TAXON_AUTHOR_ALT = "|".join(
    w.capitalize() for w in sorted(LATIN_TAXON_AUTHOR_ABBR,
                                  key=len, reverse=True))
# v2.26：多段命名人缩写（J.Sm. / S.G. / C.F. / Hand.-Mazz. 的
# Mazz.）同样是学名内部点，不是亚美尼亚文句末。按族追加，
# 长的在前，避免 S.G 抢先吃掉 S.G.。
_TAXON_AUTHOR_ALT += "|[A-Z]\\.[A-Z][a-z]{1,11}|[A-Z]\\.[A-Z]"

P42_TAXON_ABBR_RE = re.compile(
    r"(?<![A-Za-z])(?:[A-Z]|f|subsp|spp|sp|var|cf|ssp|pv|"
    + _TAXON_AUTHOR_ALT + r")\.(?![A-Za-z])")


# v2.11：罗马数字章标题（I.–VII.）的点是站方规定的章节编号形，不是
# 亚美尼亚句末误写。单字母 I./V. 已被 P42_TAXON_ABBR_RE 的 [A-Z]\. 掩掉，
# 多字母 II./III./IV./VI./VII. 需单独掩（REG14 hy 实证 5 处）。只掩行首
# 「罗马数字+点+空白」，亚美尼亚句末误写的 ASCII 句点不受影响。
# v2.26（REG28 回流）：官方拉丁学名的多段/连接词命名人缩写点。
# P42_TAXON_ABBR_RE 要求点后非字母，吃不到 `Rehd.et`、`(DC.)`、
# `J.Sm.`、`S.G.` 等形态；hy 语向实证 10 处假红。按缺陷族补一条
# 独立正则，接入 rules/text_health.py 的 _p42_mask 链。
P42_TAXON_JOIN_RE = re.compile(
    r"(?<![A-Za-z])(?:[A-Z]{1,3}\.|[A-Z]\.[A-Z][a-z]{1,11}\.|"
    r"[A-Z]\.[A-Z]\.|[A-Z][a-z]{1,11}\.(?=(?:et|ex)\b))")

P42_ROMAN_HEAD_RE = re.compile(r"(?m)^[IVX]{1,5}\.(?=\s)")


# --- P44（v1.42）韩语阿拉伯数字与量词「개」之间的空格 -----------------
# 14개 是正字法；14 개 是逐词硬拆。只收阿拉伯数字 + 개（고유어 수사
# 「열네 개」的写法合法，不在此列）。F2 实证一处。韩语标题里的「열네 개」
# 不属本形状。
P44_KO_COUNTER_RE = re.compile(r"\d+[ \t\u00a0\u202f]+개")


# --- P56（v1.72）非本语言文字系统的字母 --------------------------------
# 口径（为什么只判「已知文字系统的字母」）：
#   ① 只取 Unicode 类别 L*（字母）。数字（Nd）与标点/符号（P*/S*）不在射程——
#      fa/ar/ur 的阿拉伯-印度数字、bn 的 দাঁড়ি（U+0964，Po）都是正字法，
#      按「字符不在本语区段」一刀切会把这些全部判红（P38 踩过同一坑）。
#   ② 只对 P56 表内登记的语向生效。表外语言（未来新增）不判——不判的安全
#      方向是「不说话」，不是按拉丁默认瞎猜（埃塞俄比亚文一类会整篇假红）。
#   ③ LATIN 一律放行：拉丁残留由 P30（非拉丁语向正文）与 P52（拉丁语向
#      英文残词）负责，本条不重复出声；ja/ko 的汉字、sr 的拉丁转写同理
#      按语言登记在允许集里，不靠整类豁免。
#   ④ 未知文字系统（不在 SCRIPT_RANGES 里）静默跳过：宁可漏，不可凭空认字。
# 分母自证（v1.72 落地时实测）：本仓 530 份 mdx（3 个法规包 + 9 个博客包
#   现存语言）整语料 0 命中——本条是防「串稿/复制残留」的前置判据，不是
#   对存量缺陷的追认。正/负对照 13 格（10 单元 + 3 包级）见
#   tmp/reg3_p56_battery.py：fr 夹汉字、zh 夹希腊字母/片假名、de 引号内汉字
#   判红；ja 三套文字、ko 汉字、el/ru/bn/fa/th 本语文本不判红（bn 的 দাঁড়ি、
#   fa 的波斯数字是正字法）；包级臂另覆盖 fr 注入希腊字母 / 汉字与干净基线。
P56_SCRIPT_RANGES = [
    ("LATIN", [(0x0041, 0x005A), (0x0061, 0x007A), (0x00AA, 0x00AA),
               (0x00B5, 0x00B5), (0x00BA, 0x00BA), (0x00C0, 0x00D6),
               (0x00D8, 0x00F6), (0x00F8, 0x02B8), (0x02E0, 0x02E4),
               (0x1D00, 0x1DBF), (0x1E00, 0x1EFF), (0x2071, 0x2071),
               (0x207F, 0x207F), (0x2090, 0x209C), (0x212A, 0x212B),
               (0x2132, 0x2132), (0x214E, 0x214E), (0x2160, 0x2188),
               (0x2C60, 0x2C7F), (0xA722, 0xA7FF), (0xAB30, 0xAB69),
               (0xFB00, 0xFB06), (0xFF21, 0xFF3A), (0xFF41, 0xFF5A)]),
    ("CYRILLIC", [(0x0400, 0x052F), (0x1C80, 0x1C88), (0x2DE0, 0x2DFF),
                  (0xA640, 0xA69F)]),
    ("GREEK", [(0x0370, 0x0373), (0x0375, 0x0377), (0x037A, 0x037D),
               (0x037F, 0x037F), (0x0386, 0x0386), (0x0388, 0x03FF),
               (0x1F00, 0x1FFE), (0x2126, 0x2126)]),
    ("ARMENIAN", [(0x0531, 0x0556), (0x0561, 0x0587), (0xFB13, 0xFB17)]),
    ("HEBREW", [(0x05D0, 0x05EA), (0x05EF, 0x05F2), (0xFB1D, 0xFB4F)]),
    ("ARABIC", [(0x0600, 0x06FF), (0x0750, 0x077F), (0x0870, 0x08FF),
                (0xFB50, 0xFDFF), (0xFE70, 0xFEFF)]),
    ("DEVANAGARI", [(0x0900, 0x097F), (0xA8E0, 0xA8FF)]),
    ("BENGALI", [(0x0980, 0x09FF)]),
    ("TAMIL", [(0x0B80, 0x0BFF)]),
    ("SINHALA", [(0x0D80, 0x0DFF)]),
    ("THAI", [(0x0E00, 0x0E7F)]),
    ("GEORGIAN", [(0x10A0, 0x10FF), (0x1C90, 0x1CBF), (0x2D00, 0x2D2F)]),
    ("HAN", [(0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF),
             (0x20000, 0x2FA1F), (0x30000, 0x3134F)]),
    ("HIRAGANA", [(0x3040, 0x309F)]),
    ("KATAKANA", [(0x30A0, 0x30FF), (0x31F0, 0x31FF), (0xFF66, 0xFF9D)]),
    ("HANGUL", [(0x1100, 0x11FF), (0x3130, 0x318F), (0xA960, 0xA97F),
                (0xAC00, 0xD7AF), (0xD7B0, 0xD7FF)]),
]


P56_LANG_SCRIPTS = {
    # 拉丁文字系统语向（LATIN 本身在判据里恒放行，这里列出即「已登记」）
    "af": {"LATIN"}, "az": {"LATIN"}, "ca": {"LATIN"}, "cs": {"LATIN"},
    "da": {"LATIN"}, "de": {"LATIN"}, "en": {"LATIN"}, "es": {"LATIN"},
    "fi": {"LATIN"}, "fr": {"LATIN"}, "hr": {"LATIN"}, "hu": {"LATIN"},
    "id": {"LATIN"}, "it": {"LATIN"}, "ms": {"LATIN"}, "nl": {"LATIN"},
    "no": {"LATIN"}, "pl": {"LATIN"}, "pt": {"LATIN"}, "ro": {"LATIN"},
    "sk": {"LATIN"}, "sl": {"LATIN"}, "sq": {"LATIN"}, "sv": {"LATIN"},
    "sw": {"LATIN"}, "tr": {"LATIN"}, "vi": {"LATIN"},
    # 非拉丁文字系统语向
    "zh": {"HAN"},
    "ja": {"HAN", "HIRAGANA", "KATAKANA"},
    "ko": {"HANGUL", "HAN"},          # 汉字由 P09 单独报，不属本条的「错文字」
    "el": {"GREEK"},
    "hy": {"ARMENIAN"},
    "he": {"HEBREW"},
    "ar": {"ARABIC"}, "fa": {"ARABIC"}, "ur": {"ARABIC"},
    "hi": {"DEVANAGARI"}, "ne": {"DEVANAGARI"},
    "bn": {"BENGALI"},
    "ta": {"TAMIL"},
    "si": {"SINHALA"},
    "th": {"THAI"},
    "ka": {"GEORGIAN"},
    "be": {"CYRILLIC"}, "bg": {"CYRILLIC"}, "ru": {"CYRILLIC"},
    "uk": {"CYRILLIC"},
    "sr": {"CYRILLIC"},               # 塞尔维亚语拉丁转写合法（LATIN 恒放行）
}


# --- P58（v1.75）句首小写（按文字系统分档）------------------------------
# 由来：REG4（395 号令）48 语逐语审计实抓 hy「ՈՒԹՅՈՒՆ… 句末标记后接小写」
# 一类——译自 zh 母版时沿用中文「无大小写」的习惯，忘了起大写。
# 三条臂各自出声（v1 只有一臂时 232 处里绝大多数是缩写点误报；v3 又漏掉
# 「句末正好在行尾」这一主要形状，演进记在下面各臂上）：
#   A 行内：句末标记 + 空格 + 小写字母
#   B 亚美尼亚：verjet U+0589 + 空格 + 小写字母（A 臂的字符类不含它）
#   C 行首：本行行首是字母且小写，且**上一个非空行**以句末标记收尾
#     （mdx 段落之间夹空行，直接看 lines[n-1] 会把整类漏掉——txt 底稿与
#      mdx 成品的射程差别就在这儿。）
# 射程怎么划（两把尺对账实测出来的，不是先验定的）：
#   · 只在**本语文字有大小写范畴**的语言上出声。判据要求紧跟句末标记的字符
#     `.islower()` 为真，而无大小写的文字（汉/假名/谚/泰/天城/孟加拉/泰米尔/
#     僧伽罗/阿拉伯/希伯来）永远不会满足——但「不满足」不等于「不出声」：
#     si/hi 正文里句末后接**拉丁**小写词同样满足条件，那属 P30/P52（非拉丁语向
#     的拉丁残词）的射程，不该由本条出声。于是射程按文字系统划，脚本表复用
#     P56_LANG_SCRIPTS（分母从被评对象推导，不另抄一份语言清单）。
#   · 点前那个字符只排除**数字**（`23. října`、`2012.`、`443. sz.` 这类日期/
#     序号点不是句末）。旧写法 `before.isalpha()` 实测多吞两类真句末：
#     结合字母收尾（僧伽罗语 `බලපායි.`，Mn 不算 alpha）与引号/括号收尾
#     （亚美尼亚语 `(2026 տարվա 150 ծանուցում)։`）——672 份 mdx 严/宽对账照出来的。
#   · 缩写点（etc. / т.д. / κ.λπ. / г. / r. / թ.）另有一张表；拉丁/西里尔/希腊侧
#     保留「≤3 字母算缩写」的启发式（实测它吃掉的全是真缩写与罗马数字 I.–V.），
#     亚美尼亚 verjet 臂**不用**该启发式——它会吞掉 է/են/մեջ 这类真句末系词
#     （REG4 的 v3 扫描器实测少报 4 处），那一臂只认显式表（当前为空）。
# ka 有大小写范畴（Mkhedruli 是下写类字母，`.upper()` 给出 Mtavruli），但格鲁
# 吉亚语正文没有句首大写规范 ⇒ 显式排除：照提示改大写＝把 Mkhedruli 换成装饰
# 体，属于损坏该语。hy 反向有实证：hy.wikipedia 正文 1041/1077＝96.7% 在
# ՈՒԹՅՈՒՈՒ 之后起大写 ⇒ hy 在射程内，不属排除档。
P58_VERJET = chr(0x0589)


P58_TERMS = ".!?…"


P58_LANG_TERMS = {"hy": P58_VERJET}         # 该语专用句末标记（追加在通用集之后）


P58_CASED_SCRIPTS = {"LATIN", "CYRILLIC", "GREEK", "ARMENIAN", "GEORGIAN"}


P58_NO_CAP_LANGS = {"ka"}                   # 有大小写范畴、但无句首大写规范


P58_INLINE_RE = re.compile(r"(?<=[.!?…])([ \t]+)([^\W\d_])")


P58_FENCE_RE = re.compile(r"^```[^\n]*$.*?^```[^\n]*$", re.S | re.M)


# 词内带点（t.e）、常见「等/依次」缩写、序号代号——逐条按语向登记，
# 不做整类豁免（与 REDUPLICATION_OK 同一口径）。
P58_ABBR = {
    "etc", "ens", "osv", "apod", "atd", "usw", "dst", "ecc", "vst", "ikk",
    "e.g", "i.e", "v.b", "y.n", "m.f", "kl", "jt", "st", "ltd", "co",
    "dr", "jr", "sr", "nr", "no", "ill", "gl", "vb",
    "др", "тд", "тп", "г", "р", "м", "т", "до", "ил", "гз",
    "λπ", "κλπ",
    # v2.09：REG13 实抓 cs `např.` / sk `napr.` / fi `esim.`（4 字母，
    # 拉丁臂「≤3 字母算缩写」的启发式吃不到），2 处 ×3 语共 6 条假红。
    # 三者都是本语「例如」的标准缩写，逐条登记，不做整类豁免。
    # v2.27：REG78 en 实抓 `Centaurea stoebe subsp. australis`——subsp. 是
    # 分类学「亚种」标准缩写，学名按 P65 必须逐字保留，后跟种加词小写不是
    # 句首。5 字母同样吃不到 ≤3 启发式，逐条登记；只放行标记前的 subsp，
    # 不影响句首大写判据本身。
    "např", "napr", "esim", "subsp",
}


# v2.26：命名人缩写族与 P42 共用单一来源，避免两条判据各写一份。
P58_ABBR.update(LATIN_TAXON_AUTHOR_ABBR)


P58_ABBR_ARM = frozenset()          # verjet 臂专用；实测该语无与之冲突的缩写点


# --- P59（v2.01）本数式极性：母版「N% 以上」含本数，译文不得写成严格大于 ------
# 由来：A6 逐语人工审核（r22 阶段 B）实抓 8 语把「IgG 含量定在 10% 以上」译成
# 「超过 10%」——门槛被抬高一个点，而同块下一句「您的检测报告要能覆盖它」要求
# 10 这个值本身合格，排除式与该句自相矛盾。
# 根因不是漏改，是**漏检**：r5 那轮的探测器只认「该语向已被术语表钉住包含式」，
# 未钉＝默认已包含＝把「没看见排除式标记」当成「看见不含本数」。⇒ 本条把判据
# 从「库表反推」换成「形状直判」：母版块含 `N% 以上` ⇒ 该块对应译文块里
# **数词紧邻的比较形**即红。
# 数词锚定（模板里的 {N}＝母版该块的阈值数字）是必要条件：不带数词的
# over／más／више 在同块里可能属于别的句子。窗口式（比较词前后 12 字符内出现
# 数字）实测误报 6 语向（en "or above"、es "más del doble"、hi 「या उससे अधिक」、
# it "superiore al doppio"、ru 「не выше」…），换成数词锚定后全部归零。
# 否定词闸门：比较词与数词之间夹「不／未」（not／no／non／ikke／не／لا …）时
# 不算——«не более 10%»／«no más del doble» 是另一极（上限），不是本条要抓的形状。
# 白名单为什么不写：包含式正形（minst／cel puțin／angalau／«10% या उससे अधिक»）
# 在结构上不可能命中排除式模板（比较词与数词之间没有「or more／أو أكثر」同位）。
# 射程实测（tmp/a6/r24_polarity.py ①）：全语料 24 份中文母版只命中 A6 两块
# （块19 阈值 10；块23 罚款档 30 与 5——「30% 以上 2 倍以下」同样是含本数区间），
# 其余各篇 0 命中 ⇒ error 级不牵连带改面。
# 落地面实测（同脚本②）：47 语 × 命中块 ＝ 0 命中。
# 负控臂实测（同脚本③）：47 语各注入一条该语排除式，47/47 抓到、0 漏网；
# 表本身由 `ast.get_source_segment` 从探针文件逐字节搬入（非手打本语针）。
# 计数式（A6 块31「两个以上税号」）本轮**不入 P59**：{N} 要靠各语数词表，
# 25 语拉丁数词＋22 语非拉丁数词＝手打 needle 面过大、假阳与漏检都难校；该块
# 11 个曾写排除式的语向已由术语表 a6-b31-inclusive-two 逐语钉形（require＋forbid
# 双向）。开放项记在 blogs/系列层待裁清单.md。
# 【编号说明】P59 这个号在 v1.97 曾预留给「引号不成对」尺并被实测否掉（各语
# 引号规范不同，需先有按语种的引号表）；本条按顺序取用 P59 ⇒ 引号配对判据若做，
# 取 P60。
P59_MASTER_ANCHOR = re.compile(u"(\\d+(?:[.,]\\d+)?)\\s*%\\s*以上")


P59_NEGWORDS = ("not ", "no ", "non ", "ne ", "ikke ", "inte ", "kein ", "nie ", "n\u00e3o ", "\u043d\u0435 ", "\u043d\u0456 ", "\u0644\u0627 ",)


# 打包时剔除的垃圾文件（与 S05 检查口径一致，保证打出的包不会被自己判 S05）
JUNK_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}


JUNK_PARTS = {"__MACOSX", "__pycache__", ".git", ".svn"}

# P57 千分位表：分布填充（原 engine 顶层 for 循环，迁出时保持同一语义）。
for _p57lg in "af be bg cs da el fi fr hr hu hy ka no pl ro ru sk sl sq sr sv uk".split():
    P57_THOUSANDS[_p57lg] = " "
for _p57lg in "az ca de es id it ms nl pt tr vi".split():
    P57_THOUSANDS[_p57lg] = "."
for _p57lg in "ar bn en fa he hi ja ko ne si sw ta th ur zh".split():
    P57_THOUSANDS[_p57lg] = ","


__all__ = ['EXCERPT_CLOSERS', 'EXCERPT_TERMINAL', 'JUNK_NAMES', 'JUNK_PARTS', 'LATIN_TAXON_AUTHOR_ABBR', 'P41_LABEL_SEP_RE', 'P41_LIST_RE', 'P42_CODE_RE', 'P42_DECIMAL_RE', 'P42_LATIN_QUOTE_RE', 'P42_MDLINK_DEST_RE', 'P42_ROMAN_HEAD_RE', 'P42_TAXON_ABBR_RE', 'P42_TAXON_JOIN_RE', 'P42_TH_RE', 'P42_URL_RE', 'P44_KO_COUNTER_RE', 'P56_LANG_SCRIPTS', 'P56_SCRIPT_RANGES', 'P58_ABBR', 'P58_ABBR_ARM', 'P58_CASED_SCRIPTS', 'P58_FENCE_RE', 'P58_INLINE_RE', 'P58_LANG_TERMS', 'P58_NO_CAP_LANGS', 'P58_TERMS', 'P58_VERJET', 'P59_MASTER_ANCHOR', 'P59_NEGWORDS', '_TAXON_AUTHOR_ALT', '_p57lg']
