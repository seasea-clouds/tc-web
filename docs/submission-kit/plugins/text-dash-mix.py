# -*- coding: utf-8 -*-
"""B10：同一文件不得混用 — 与 –

em dash 与 en dash 混排时，同一批稿件里会出现两种破折号，排版不统一。
"""

RULE = "B10"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "批量修复脚本只替换了部分语向时，同篇会同时存在 `—` 与 `–`，肉眼几乎看不出，站方排版按字符宽度对齐后长短不一；REG23/REG24 的破折号统一就是按「整篇只用一种」做的。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            if "\u2014" in body and "\u2013" in body:
                emit(RULE, SEVERITY, tag, "同一文件混用 — 与 –（请统一）")

def review(finding, view):
    return finding
