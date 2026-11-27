# -*- coding: utf-8 -*-
"""P99：句末标点不得重复（含乌尔都语 ۔ U+06D4）

P06 已覆盖 ASCII !! / ?? / ，， 与阿拉伯文 ،،、孟加拉文 ।।，但乌尔都语
句末标点 U+06D4 的重复（۔۔）此前没有规则命中。REG237 的 ur 初稿全篇把
单句点批量写成 ۔۔，机检全绿，靠人工审计才抓到。
"""
import re

from core.textutil import _line_of
from plugins._shared import fmt_hits

RULE = "P99"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG237 ur 初稿全篇出现 ۔۔（U+06D4 重复），P06 的 DBLPUNCT_RE 未覆盖该字符，"
          "机检 PASS，逐语审计才发现；重复句末标点是批量替换事故，正式稿只保留一个。",
}

# 只补 P06 未覆盖的乌尔都语句末标点 U+06D4；其余重复标点仍归 P06。
REPEATED_FINAL = re.compile(r"\u06D4{2,}")


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            hits = [(_line_of(body, m.start()), "%r" % m.group(0))
                    for m in REPEATED_FINAL.finditer(bare)]
            if hits:
                emit(RULE, SEVERITY, tag, "句末标点重复: " + fmt_hits(hits))


def review(finding, view):
    return finding
