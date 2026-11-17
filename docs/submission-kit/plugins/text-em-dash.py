# -*- coding: utf-8 -*-
"""ST01：正文禁用 em dash（——或—）

破折号是 AI 腔最稳定的形状标记：中文稿里几乎只在机器扩写时出现，正式商务稿改用冒号、拆句或括号。
"""
from plugins._style import style_findings

RULE = "ST01"
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
    RULE: "AI 腔是最稳定的批量产稿痕迹：破折号、套话、反转钩子三件套同时出现时，读者第一眼就能判断「这不是人写的」。方案 3.1 把 em dash 列为硬禁令，理由是中文正式稿本来不用它——出现即机器痕迹，不需要逐句判断语义。与 ST02（en dash 只许夹在区间）、B06（框线字符）同属「格式纪律」层：判形状不判语义，因此可以零误报地锁死。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
