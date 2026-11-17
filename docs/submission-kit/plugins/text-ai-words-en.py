# -*- coding: utf-8 -*-
"""ST03：正文不得出现英文 AI 高频词（delve / leverage / seamless…）

英文正文里的 AI 高频词是生成式文本的指纹，逐词登记为禁用形。
"""
from plugins._style import style_findings

RULE = "ST03"
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
    RULE: "英文语向的 AI 腔有稳定词表：delve、leverage、seamless、robust、game-changer、unlock、landscape、in today's、ever-evolving 一类。这些词在英文商务稿里并非绝对不能用，但成串出现就是生成痕迹；实测存量英文稿命中率极低（词表按真实缺陷逐条登记，不做整类推断），因此按 error 锁。与 ST04（中文 AI 词）、ST08（其余 46 语套话）同族。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
