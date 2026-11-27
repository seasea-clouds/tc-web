# -*- coding: utf-8 -*-
"""P04：正文关键数字跨语言齐全；条款区间枚举不得漏中间项

从母版正文抽 ≥1000 的整数与小数，各语都必须在正文里出现（含单位换算）。
另挂一条区间枚举判据：母版「第（六）至（八）条」类区间，译文同序块若只列
两端点、既缺中间序数词又没有区间连接符（破折号或「到/至」介词），即报——
提示是补全枚举，不是加破折号。
"""

import re

from core.textutil import (
    extract_fact_numbers, find_number, normalize_digits, normalize_unit_numbers,
    cn_number_to_int,
)

RULE = "P04"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "正文数字是读者据以决策的事实（门槛、金额、期限）；某语漏写一个数，"
                    "读者拿到的条件就与中文母版不同。两侧都先过单位换算：母版「8000 万元」"
                    "与译文「80 million」「8000万円」是同一个事实，不归一就 47 语整片假红。"
                    "REG89 阶段 5-a 回流：hy/it/sr/uk 同型缺陷——母版「第（六）至（八）条」，"
                    "译文写成「(6) və (8)」「(6) in (8)」，漏掉第 7 项；P04 原只查单点数字"
                    "在场，看不见枚举区间的中间项缺失。本臂按母版区间锚点对齐同序块：端点在、"
                    "中间项缺、且无区间连接符才报；提示口径是「补全枚举」，不是「加破折号」"
                    "（正文禁 em/en dash，破折号不替代逐项枚举）。",
}

# 母版区间：第（六）至（八）条
_MASTER_INTERVAL_RE = re.compile(
    r"第（([〇零一二三四五六七八九十百千两]+)）至（([〇零一二三四五六七八九十百千两]+)）条")
# 译文块内序数形：(6) / 6)
_ORD_RE = re.compile(r"\((\d{1,2})\)|(\d{1,2})\)")
# 区间连接符：破折号族 + 多语「到/至」介词词形（闭类，新增须有正字法依据）
_CONNECTOR_RE = re.compile(
    r"[–—−~〜]|\b(?:a|à|až|až po|bis|do|hasta|hingga|sampai|đến|til|till|"
    r"to|tot en met|până la|până|ila|hadi|until)\b"
    r"|עד|حتى|إلى|تا|سے|থেকে|দেখি|देखि|से|සිට|முதல்|வரை|ถึง|έως|から")

_DIGIT_SRC = (
    "0123456789",
    "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9",  # fa/ur
    "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669",  # ar
    "\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f",  # hi/ne
    "\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef",  # bn
)
_DIGIT_MAP = {ch: str(i) for src in _DIGIT_SRC for i, ch in enumerate(src)}


def _norm_digits(text):
    return "".join(_DIGIT_MAP.get(c, c) for c in text)


def _interval_check(art, emit):
    ml = art.master_lang
    master_blocks = art.blocks(ml)
    intervals = []
    for bi, blk in enumerate(master_blocks):
        for m in _MASTER_INTERVAL_RE.finditer(blk):
            x = cn_number_to_int(m.group(1))
            y = cn_number_to_int(m.group(2))
            if x and y and y - x >= 2:
                intervals.append((bi, x, y))
    if not intervals:
        return
    for lg in art.langs:
        if lg == ml:
            continue
        tblocks = art.blocks(lg)
        for bi, x, y in intervals:
            if bi >= len(tblocks):
                continue
            blk = _norm_digits(tblocks[bi])
            ords = {int(g) for tup in _ORD_RE.findall(blk) for g in tup if g}
            if x not in ords or y not in ords:
                continue
            if any(k in ords for k in range(x + 1, y)):
                continue
            if _CONNECTOR_RE.search(blk):
                continue
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "区间枚举缺中间项：母版第（%d）至（%d）条，译文同序块只列端点；"
                 "请补全枚举中间各项（不要用破折号替代逐项枚举）" % (x, y))


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        facts = extract_fact_numbers(normalize_unit_numbers(art.body(ml)))
        for lg in art.langs:
            nb = normalize_unit_numbers(normalize_digits(art.body(lg)))
            missing = [s for s in facts if not find_number(nb, s)]
            if missing:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "关键数字缺失（对照 %s）: %s" % (ml, missing))
        _interval_check(art, emit)


def review(finding, view):
    return finding
