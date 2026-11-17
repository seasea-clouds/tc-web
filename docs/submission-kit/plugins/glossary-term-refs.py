# -*- coding: utf-8 -*-
"""S12：references 标题层术语契约（本国机构专名残留）

references[].title 是站方结构化数据的一部分，与正文同口径守；这一层最常见
的缺口是机构全称仍是中文未译。
"""
from plugins._glossary import glossary_findings

RULE = "S12"
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
    RULE: "v1.40 实测：某语 references 第 2 条标题仍是中文机构全称（未译），"
          "读者点开引用看到中文；正文层判据完全看不见。references 标题是站方"
          "结构化数据的一部分，与摘要、标题同属元数据语义层，必须与正文同口径守。",
}


def run(view, emit):
    for rule, sev, loc, detail in glossary_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
