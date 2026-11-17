# -*- coding: utf-8 -*-
"""WR05：frontmatter references 3–4 条

题录条数下限 3、上限 4；旧判据只拦 >6，起手骨架清空题录时提前提示。
"""
from plugins._writing import writing_findings

RULE = "WR05"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["frontmatter"]}

RATIONALE = {
    RULE: "题录是文章可信度的结构化凭证：少于 3 条说明没有做过来源核对，多于 4 条则说明在堆砌。旧判据只拦 >6，2 条甚至 0 条都能过——起手骨架按设计清空样例题录，WR05 在此报 error 是刻意的提前提示，README 验收口径「除缺语/待补项外内容判据 0 error」已把它算在内。",
}


def run(view, emit):
    for rule, sev, loc, detail in writing_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
