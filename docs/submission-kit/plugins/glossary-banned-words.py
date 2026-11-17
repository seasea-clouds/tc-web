# -*- coding: utf-8 -*-
"""P43：禁用译法（词形合法、语法通顺、其余判据全绿，只有「该用哪个词」能拦）

全篇匹配、不分块：正文 + title + excerpt + references 标题四个面。
"""
from plugins._glossary import glossary_findings

RULE = "P43"
RULES = [RULE]
PHASE = 30
CATEGORY = "glossary"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "glossary"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body", "frontmatter"]}

RATIONALE = {
    RULE: "r5 审读实证：vi 把「进场」写成 vào sân（进院子的字面义）、ta 把"
          "「诊断」写成 நோயறிதல்（疾病诊断）、si 写成 රෝග විනිශ්චය（疾病判别）——"
          "三处词形合法、语法通顺、其余判据全绿，只有「这个概念在本篇只能用"
          "哪个词」能拦。禁用语必须四个面全扫：只扫正文时，title/excerpt/"
          "references 的残留被正文层掩盖，列表页仍显示错误词形。匹配按词形"
          "分档（单字整词、短语与带 * 词干子串、zh/ja/th 子串），源自 hy "
          "«ՉՈՒՆ»⊂«չունի» 的自碰事故。",
}


def run(view, emit):
    for rule, sev, loc, detail in glossary_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
