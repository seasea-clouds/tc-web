# -*- coding: utf-8 -*-
"""P03：各语配图集合与母版一致

少一张图或多一张图都会让该语向的图注与正文对应关系断掉。
"""
import re

from core.consts import IMG_REF_RE
RULE = "P03"
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
    RULE: "配图是逐语复制的同一批文件；漏拷或多拷一张，正文里就会出现「见下图」却没有图、或图在文中无人引用，读者点的图注与图对不上。P18 只管顺序、这条管集合，两条互补，缺一条都会漏掉一类事故。",
}



def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        img_re = IMG_REF_RE % re.escape(art.slug)
        figs = {lg: frozenset(re.findall(img_re, art.body(lg)))
                for lg in art.langs}
        base = figs[ml]
        for lg in sorted(figs):
            if figs[lg] != base:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "%s 图片集与 %s 不一致（缺 %s，多 %s）"
                     % (lg, ml, sorted(base - figs[lg]),
                        sorted(figs[lg] - base)))

def review(finding, view):
    return finding
