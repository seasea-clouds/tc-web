# -*- coding: utf-8 -*-
"""P01：同一图片在同一语言内不得被引用两次

同一张图重复引用会让读者以为有两张图，且 P18 顺序比对随之失真。
"""
import re

from core.consts import IMG_REF_RE
RULE = "P01"
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
    RULE: "图片是按图位分配的（每篇 fig-01…fig-0N 各司其职）；同一图被引用两次，通常是复制段落时把上图的引用一起带过来，结果后一张图在页面上消失、读者看到两张相同的图，图注也对不上。",
}



def run(view, emit):
    for art in view.articles:
        img_re = IMG_REF_RE % re.escape(art.slug)
        for lg in art.langs:
            names = re.findall(img_re, art.body(lg))
            dups = sorted({n for n in names if names.count(n) > 1})
            if dups:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "同一图片被引用多次: %s" % dups)

def review(finding, view):
    return finding
