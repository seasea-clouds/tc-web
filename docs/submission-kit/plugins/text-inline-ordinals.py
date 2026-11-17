# -*- coding: utf-8 -*-
"""ST07：段内序号连排（①②③ / 第一，第二，/ first, second,）

一段里三个以上序号标记，按方案 3.1a 应拆成列表；warning 交人工评估。
"""
from plugins._style import style_findings

RULE = "ST07"
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
    RULE: "方案 3.1a 要求「能列表化的枚举不要写成散文」：一段里塞三个以上序号标记，读者要自己数层级。判 warning 是因为法规解读段确实存在必须连排的情形（引用官方条款的项下分项），不能一刀切判红；但连续序号是排版债，必须让人看见。存量实测仅 1 处命中，说明误报面很小。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
