# -*- coding: utf-8 -*-
"""WR01：禁写范围声明小节（「不覆盖什么」「本篇不展开 X」）

README 写作要求硬规则第 8 条：范围/例外有实质内容就并进正文，不设自我声明小节。
"""
from plugins._writing import writing_findings

RULE = "WR01"
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
    RULE: "10-30 曾定禁令、11-07 只删了「要求写」的条款没留显式禁令，导致 C4/D2 照抄已交付母版文风复发——这是「文档写了的规则没人执行」的典型。判据只扫 ##/### 小节标题、不扫正文：正文里 out of scope / not covered here 是合法实义陈述，全文扫会误伤 A8/C1 等篇。存量 12 条命中全部为已交付稿，按「已过审不追溯」由契约 legacy 名单降级 warning。",
}


def run(view, emit):
    for rule, sev, loc, detail in writing_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
