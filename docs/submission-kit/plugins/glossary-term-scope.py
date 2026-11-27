# -*- coding: utf-8 -*-
"""S14：术语契约的译文块数不足，契约无法执行

块序号对齐是 S08 的前提：译文块数少于母版时，同一序号的块已经不是同一件事，
继续比对只会产出级联误报。两条路径都静默跳过，等于「契约悄悄失效」。
"""
from plugins._glossary import glossary_findings

RULE = "S14"
RULES = [RULE]
PHASE = 30
CATEGORY = "glossary"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "glossary"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "I17 立规：译文块数 < 母版块数时契约整体无法执行，而两条分支"
          "（scope=block 的缺索引跳过、scope=all 的越界跳过）都静默 return，"
          "结果是「契约登记了、全库回归全绿、实际一条都没跑」——比没写契约更"
          "难发现。本条把「块结构不齐」本身报出来，红面写明译文块数、母版块数"
          "与缺几块，修稿清单可直接落地。",
}


def run(view, emit):
    for rule, sev, loc, detail in glossary_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
