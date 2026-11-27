# -*- coding: utf-8 -*-
"""P83：单块篇幅相对本语中位数骤降（压缩丢层 / 丢句的通用筛）

REG109 ta 第13块漏掉「发现即有效防治」一层，原文一句被并掉；P23 块数不变，
P77 只筛解读段，逐块字数此前无人比。判据不拿译文与中文比绝对长度（各语
膨胀率差异太大），而是先算**该语全部块的字数比中位数**，再找显著低于自身
中位数的单块——同一语向内部的相对异常，语言无关。warning 级只筛待回读，
不代替人工逐语直读。
"""
import re
import statistics

RULE = "P83"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v2.25 立规（REG109 ta 实证）：第13块丢「发现即有效防治」整层，块数、"
                    "列表数、数字锚都对齐，人工逐块比字数才发现。绝对长度比会被"
                    "语向膨胀率淹没；改用同语向块间相对值，能筛出「这一块明显比"
                    "本篇其他块薄」的异常，交人工回读。",
}

_MIN_MASTER = 10       # 母版块太短不参与（比值噪声大）
_MIN_GAP = 10          # 译块比母版少这么多字符才判（避免短块抖动）
_RATIO_FLOOR = 0.35    # 低于本语中位数的 35% 才判
_LIST_RE = re.compile(r"(?<!\d)\d{1,2}[.)．]")


def _is_list(block):
    """7 项有害生物这类块天然比同篇叙述块短，不参与压缩比。"""
    return len(_LIST_RE.findall(block)) >= 3


def _chars(s):
    return len("".join((s or "").split()))


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = art.blocks(ml)
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = art.blocks(lg)
            if len(cur) != len(base):
                continue
            ratios = []
            for i, mb in enumerate(base):
                mlen = _chars(mb)
                if (mlen >= _MIN_MASTER and i < len(cur)
                        and not _is_list(mb) and "<!-- original -->" not in mb):
                    ratios.append(_chars(cur[i]) / float(mlen))
            if len(ratios) < 3:
                continue
            med = statistics.median(ratios)
            for i, mb in enumerate(base):
                mlen = _chars(mb)
                clen = _chars(cur[i]) if i < len(cur) else 0
                if (mlen < _MIN_MASTER or mlen - clen < _MIN_GAP
                        or _is_list(mb) or "<!-- original -->" in mb):
                    continue
                if clen / float(mlen) < med * _RATIO_FLOOR:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块篇幅仅为母版 %d%%，低于本语中位比 %.0f%% 的 %.0f%%"
                         "（疑似压缩丢层/丢句，须逐句回读）"
                         % (i + 1, round(100.0 * clen / mlen),
                            round(100.0 * med), round(100.0 * _RATIO_FLOOR)))


def review(finding, view):
    return finding
