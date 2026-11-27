# -*- coding: utf-8 -*-
"""P100：括号内拉丁缩写不得留内侧空格

模板里应写 (NMPA)，而不是 ( NMPA )。REG237 的 hy/ka 初稿出现过
「( NMPA )」，P08/P15 未报，靠逐语审计修掉。该缺陷不限语向：
任何语向把缩写放进圆括号时都不应在括号内侧加空格。
"""
import re

from core.textutil import _line_of
from plugins._shared import fmt_hits

RULE = "P100"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG237 hy/ka 初稿把官方缩写写成 ( NMPA )，括号内侧多空格；"
          "P08 只判混排文字系统、P15 只判标点前空格，均未覆盖此形状。"
          "正式稿缩写括号应紧贴，写作 (NMPA)。",
}

# 括号内为 2–10 位大写拉丁字母/数字/常见连接符，且内侧有空白。
ACRONYM_PAREN = re.compile(r"\(\s+([A-Z][A-Z0-9&./-]{1,9})\s+\)")


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            hits = [(_line_of(body, m.start()), "%r" % m.group(0))
                    for m in ACRONYM_PAREN.finditer(body)]
            if hits:
                emit(RULE, SEVERITY, tag, "缩写括号内侧有空格: " + fmt_hits(hits))


def review(finding, view):
    return finding
