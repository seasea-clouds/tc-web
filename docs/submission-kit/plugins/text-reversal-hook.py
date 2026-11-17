# -*- coding: utf-8 -*-
"""ST05：反转钩子 / 设问自答句式

「看似 X，实则 Y」「不是 X，而是 Y」「not just X but Y」是营销号的钩子句式。
"""
from plugins._style import style_findings

RULE = "ST05"
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
    RULE: "反转钩子是自媒体的开场套路：先立一个要被推翻的表象，再给出「真相」。对外合规文案里这种句式制造的是虚假张力——读者要的是判断依据，不是叙事反转。实测中文稿「看似…实则」出现频率最高，英文稿 「not just … but」同型；判据按句式正则匹配，不依赖上下文。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
