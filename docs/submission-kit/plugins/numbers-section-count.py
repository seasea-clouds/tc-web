# -*- coding: utf-8 -*-
"""P02：各语小节数与中文母版一致

小节数不一致说明译文把「## 」标题改成了正文，或自行加了一节。
"""
import re


RULE = "P02"
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
    RULE: "小节数是站点自动目录的骨架：译文把某个 ## 标题并进正文，目录里就少一项，读者按目录跳转会对不上内容；自行加节则让同一篇文章在不同语向的信息层级不同。P21 管小节内的列表项数，P02 管小节本身的个数，两条一起才锁住结构对等。",
}



def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        sec = {lg: len(re.findall(r"(?m)^## ", art.body(lg))) for lg in art.langs}
        off = {lg: n for lg, n in sorted(sec.items()) if n != sec[ml]}
        if off:
            emit(RULE, SEVERITY, art.slug,
                 "小节数与基准 %s（%d 节）不一致: %s" % (ml, sec[ml], off))

def review(finding, view):
    return finding
