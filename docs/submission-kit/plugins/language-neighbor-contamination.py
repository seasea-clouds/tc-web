# -*- coding: utf-8 -*-
"""P68：近缘语言正字法污染（词表在 策略库 lexicons 表（neighbor））

条件只由语向 + 词形决定，不依赖术语契约、不绑篇目锚点。
"""
from plugins._language import check_neighbor_contamination

RULE = "P68"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.21 立规（REG23 沿革）：近缘语言（da/no、cs/sk、hr/sr、uk/be）共用大量"
                    "词形，译者按邻国语写正字法时读者读得懂但拼错了；词表在 "
                    "策略库 lexicons 表（neighbor），条件只由语向 + 词形决定，不依赖术语契约、"
                    "不绑篇目锚点。与 P66 并列做全文扫描，两者互不干扰（一条判主体视角、"
                    "一条判正字法）。",
}


def run(view, emit):
    def _add(rule, sev, loc, detail):
        emit(rule, sev, loc, detail)

    for art in view.articles:
        check_neighbor_contamination(view, art.parsed, art.slug, _add)


def review(finding, view):
    return finding
