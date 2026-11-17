# -*- coding: utf-8 -*-
"""P06：正文不出现重复标点（!! / ?? / ，，）

重复标点是情绪化写法或批量替换事故，正式稿只用单标点。
"""
import re

from plugins._shared import fmt_hits
from core.textutil import _line_of
from core.consts import DBLPUNCT_RE

RULE = "P06"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "实测来自批量替换脚本把句末「。」替换成「。。」、以及作者手动敲 !! 强调；站方排版会把重复标点原样显示，商务稿里显得不专业。多语种枚举见 DBLPUNCT_RE（含阿拉伯文 ،، 与孟加拉文 ।।）。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            hits = [(_line_of(body, m.start()), "%r" % m.group(0))
                    for m in DBLPUNCT_RE.finditer(bare)]
            if hits:
                emit(RULE, SEVERITY, tag, "出现重复标点: " + fmt_hits(hits))

def review(finding, view):
    return finding
