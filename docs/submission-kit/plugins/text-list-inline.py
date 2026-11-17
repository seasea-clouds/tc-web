# -*- coding: utf-8 -*-
"""B08：一行只能写一个列表项

同一行写多个 `- ` 项时 markdown 只渲染第一项，后面的箭头和文字进正文。
"""
import re

RULE = "B08"
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
    RULE: "只有行首是列表标记时才查同行多个标记——行中的连字符配对（如 ru 的「далее - х」）不是列表项，markdown 也不渲染成多项，不判。REG8 俄语实测过这条误报，v1.87 因此把射程收窄到行首。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(body.split("\n"), 1):
                if re.match(r"^\s{0,3}[-*]\s+\S", ln) \
                        and len(re.findall(r"(?:^|\s)[-*]\s+\S", ln)) > 1:
                    emit(RULE, SEVERITY, tag,
                         "第 %d 行有多个列表项写在同一行" % i)
                    break

def review(finding, view):
    return finding
