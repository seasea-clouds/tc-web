# -*- coding: utf-8 -*-
"""S09：摘要术语契约（frontmatter.excerpt 必须出现 / 不得出现）

摘要是读者第一眼看到的内容，此前只受长度约束（F07）。母版摘要按四层框架
逐层罗列时，译文漏掉其中一层，正文完全正确、长度也合规，一条都不报错。
"""
from plugins._glossary import glossary_findings

RULE = "S09"
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
    RULE: "F1 实证：15 语摘要漏掉「政策依据」层，瑞典语漏掉后只剩三项，正文"
          "完全正确、长度也合规，P 族、F 族、L 族一条都不报错。条款可带可选 "
          "zh 锚，锚短语出现在该篇自己的 zh 摘要里才激活——「该篇摘要承载哪几层」"
          "逐篇不同，摘要没承诺这一层的文章不应被别篇的契约套住。require_all 与 "
          "require 相反：同一语言的列表里每一短语都必须出现，用于摘要同时承载"
          "多层事实时逐层锁定（v1.74）。",
}


def run(view, emit):
    for rule, sev, loc, detail in glossary_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
