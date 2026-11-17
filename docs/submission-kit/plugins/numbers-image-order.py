# -*- coding: utf-8 -*-
"""P18：配图引用顺序与母版一致

顺序不同会让读者按错误的次序看图，讲解与图注错位。
"""
import re

from core.consts import IMG_REF_RE
RULE = "P18"
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
    RULE: "正文按 fig-01→fig-0N 的顺序讲流程；某语把两段调换后，图注编号与讲解步骤就不再对应。读者看到某一句「如下图」时，图已经在三段之外，而 P03 只比集合，集合相同、顺序错乱时它完全看不见。",
}



def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        img_re = IMG_REF_RE % re.escape(art.slug)
        seq = {lg: tuple(re.findall(img_re, art.body(lg))) for lg in art.langs}
        base = seq[ml]
        for lg in sorted(seq):
            if seq[lg] != base:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "配图引用顺序与 %s 不一致（%d 张图）" % (ml, len(base)))

def review(finding, view):
    return finding
