# -*- coding: utf-8 -*-
"""WR02：独立成文：无元话语、无系列导览、篇间零互链

正文只留唯一 CTA 链接；「本文是系列第三篇」一类元话语不进正文。
"""
from plugins._writing import writing_findings

RULE = "WR02"
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
    RULE: "对外文案要求每篇独立成文：读者从搜索进来只看到这一页，「本文是系列第三篇」「上篇讲了什么」这类元话语对他没有信息量，还会把站内互链做成一条低质内链。扫描前排除配图语法与 /packages/ CTA，存量 48 语全部 0 命中——射程是按真实误报面收窄过的，不是拍脑袋定的。",
}


def run(view, emit):
    for rule, sev, loc, detail in writing_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
