# -*- coding: utf-8 -*-
"""P10：正文不得出现相邻重复单词（the the / и и / los los）

站方回执口径是「相邻重复词一律改写，即使语法成立」。部分语言的重叠副词
（tr ayrı ayrı、ur باری باری）是固定搭配，逐词组放行；德语逗号引出的关系
从句同形（…, das das …）只放行逗号紧跟的形状。
"""
import re

from core.consts import REDUPLICATION_REWRITE_HINT, _MD_PH
from core.textutil import _line_of
from plugins._health import repeat_pair_hits
from plugins._shared import fmt_hits

RULE = "P10"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.14 站方回执口径「相邻重复词一律改写」；v1.58 升 error 前先两头修平："
                    "一边消掉结合字母切词的假阳性（词内被 \\b 切开），一边补上元音符"
                    "结尾词的盲区（进不了 \\w{2,}），否则升档要么判红正确稿件、要么根本"
                    "抓不全。存量按新口径改了 F2 7 处、F3 24 处、F4 26 处，六包＋sample "
                    "归零后才升档。报错附本域实证改写词形（REDUPLICATION_REWRITE_HINT），"
                    "做到「报错即给改法」。",
}


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", _MD_PH, body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", _MD_PH, bare)
            hits = [(_line_of(bare, a), "%r" % shape)
                    for a, b, shape in repeat_pair_hits(bare, lg)]
            if not hits:
                continue
            msg = "出现重复单词: " + fmt_hits(hits)
            hint = REDUPLICATION_REWRITE_HINT.get(lg)
            if hint:
                msg += "（本域「逐一/分步」重叠习语实证改写: %s）" % hint
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), msg)


def review(finding, view):
    return finding
