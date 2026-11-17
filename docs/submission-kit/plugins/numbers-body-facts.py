# -*- coding: utf-8 -*-
"""P04：正文关键数字跨语言齐全

从母版正文抽 ≥1000 的整数与小数，各语都必须在正文里出现（含单位换算）。
"""

from core.textutil import (
    extract_fact_numbers, find_number, normalize_digits, normalize_unit_numbers,
)

RULE = "P04"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "正文数字是读者据以决策的事实（门槛、金额、期限）；某语漏写一个数，读者拿到的条件就与中文母版不同。两侧都先过单位换算：母版「8000 万元」与译文「80 million」「8000万円」是同一个事实，不归一就 47 语整片假红。",
}



def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        facts = extract_fact_numbers(normalize_unit_numbers(art.body(ml)))
        for lg in art.langs:
            nb = normalize_unit_numbers(normalize_digits(art.body(lg)))
            missing = [s for s in facts if not find_number(nb, s)]
            if missing:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "关键数字缺失（对照 %s）: %s" % (ml, missing))

def review(finding, view):
    return finding
