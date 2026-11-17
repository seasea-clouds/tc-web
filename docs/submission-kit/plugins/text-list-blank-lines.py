# -*- coding: utf-8 -*-
"""B07：列表项之间不得空行

列表项之间插空行会把一个列表拆成多个，编号重新从 1 开始。
"""
import re

RULE = "B07"
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
    RULE: "markdown 以空行切分列表块：项间空行会让第 2 项起变成新列表，有序列表编号全部回到 1，站点渲染出来是 `1. 1. 1.`。批量产稿改写长列表时最容易手滑插入空行。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            lines = body.split("\n")
            for i in range(len(lines) - 2):
                if re.match(r"^\s*[-*]\s", lines[i]) \
                        and lines[i + 1].strip() == "" \
                        and re.match(r"^\s*[-*]\s", lines[i + 2]):
                    emit(RULE, SEVERITY, tag,
                         "第 %d 行列表项之间有空行（会渲染成多个列表）" % (i + 1))
                    break

def review(finding, view):
    return finding
