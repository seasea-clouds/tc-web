# -*- coding: utf-8 -*-
"""ST02：en dash 只能用在数字/编号区间（2–4、S0–S13、p01–p06）

区间之外用 en dash 是英文排版习惯的直译痕迹，中文稿应写「到」或拆句。
"""
from plugins._style import style_findings

RULE = "ST02"
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
    RULE: "en dash 在中文排版里只有一个合法位置：数字或编号区间（2–4、S0–S13、p01–p06）。带空格的 en dash（「A – B」）是英文排版习惯直译进来的痕迹，在中文句子里读起来像断句错误。判据只认形状：命中「– 前面或后面是空白」即报，不判断上下文语义，因此不会与区间用法冲突。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
