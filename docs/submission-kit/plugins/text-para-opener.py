# -*- coding: utf-8 -*-
"""ST06：段首 AI 连接词（Moreover / Furthermore / 而且 / 此外）

单次可保留，堆叠即改写；warning 交人工判断段落节奏。
"""
from plugins._style import style_findings

RULE = "ST06"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "段首连接词是机器扩写的填充物：单段用一次可以接受，连续多段以同一个词开头就是模板痕迹。判 warning 而不是 error，是因为「此外」在中文里也是正常承接词，一刀切会误伤合法行文；给人工留一步判断，但让它可见。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
