# -*- coding: utf-8 -*-
"""ST08：其余 46 语的 AI 套话（句首填充语）

逐语登记的总结套话族；只判句首填充形状，句中的实义形放行。
"""
from plugins._style import style_findings

RULE = "ST08"
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
    RULE: "v1.58 两处射程修正：总结套话族的缺陷形状是句首填充语（「Kesimpulannya, …」「Závěrem, …」），同一串词落在句中是本语言正常实义形——id/ms「apa kesimpulannya」＝「它的结论是什么」、cs「závěr za závěrem」＝「结论跟着结论」、ne「पाँच निष्कर्षमा」＝「归入五条结论」，五篇实测 12 处全是这类。另加引号豁免：整段命中被一对引号包住＝文中在讨论这个词本身。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
