# -*- coding: utf-8 -*-
"""core.consts.claims — 常量与词表分片。

按依赖顺序切出的分片；跨片依赖在此显式导入。
本包是全仓最低层：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re



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


__all__ = ['DBLPUNCT_RE', 'DBLSPACE_RE', 'ELLIPSIS_RE', 'NUM_SEP', 'REDUPLICATION_OK', 'REPEAT_LEXEME_NEXT', 'TRIPLE_NL_RE', '_MIX_SCRIPT_KEYS', '_REPEAT_NEXT_RE']
