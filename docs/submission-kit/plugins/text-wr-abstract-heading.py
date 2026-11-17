# -*- coding: utf-8 -*-
"""WR04：抽象小节标题（Overview / 清单预告句）

「概览」「本文将介绍」一类标题没有信息量，标题要写读者能带走的那件事。
"""
from plugins._writing import writing_findings

RULE = "WR04"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "列表卡片与站内导航只显示标题，抽象标题（Overview、概览、本文要点）等于浪费唯一的展示位；读者点进来之前不知道能拿到什么。这条与 S11（标题术语契约）、F03（标题形态）分属三层：F03 判形、S11 判术语、WR04 判「这一行有没有信息量」。",
}


def run(view, emit):
    for rule, sev, loc, detail in writing_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
