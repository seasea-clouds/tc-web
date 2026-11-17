# -*- coding: utf-8 -*-
"""S11：标题术语契约（frontmatter.title 必须出现 / 不得出现）

标题是站方列表页的唯一展示层，术语与正文不一致会让同一概念在搜索与导航里
变成两件事。
"""
from plugins._glossary import glossary_findings

RULE = "S11"
RULES = [RULE]
PHASE = 30
CATEGORY = "glossary"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "glossary"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["frontmatter"]}

RATIONALE = {
    RULE: "v1.38 实测：某语标题把「注册」译成「登记」，与正文术语不一致，搜索"
          "与站内导航把同一概念当成两件事；v1.45 起条款可带 zh 锚，只有该篇"
          "标题本来承载这一层时才激活。元数据层与正文层同有语义——S09/S11/S12 "
          "三条分别守摘要、标题、references 标题，缺一层就有漏；合并成一条时"
          "正文命中会掩盖元数据缺口。",
}


def run(view, emit):
    for rule, sev, loc, detail in glossary_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
