# -*- coding: utf-8 -*-
"""P07：行内不出现连续多空格

连续空格来自复制粘贴或表格对齐，渲染时被折叠但会污染 diff 与检索。
"""
import re

from plugins._shared import fmt_hits
from core.textutil import _line_of
from core.consts import DBLSPACE_RE

RULE = "P07"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "中英混排复制时最常见：从 PDF 或表格粘过来的段落里夹着双空格，markdown 渲染会折叠成单空格，但 diff 里每一行都变，评审时看不到真正改动，属于纯噪音；批量替换脚本也会因为匹配不上而静默漏改。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            hits = [(_line_of(body, m.start()), "连续空格")
                    for m in DBLSPACE_RE.finditer(bare)]
            if hits:
                emit(RULE, SEVERITY, tag, "出现连续空格: " + fmt_hits(hits))

def review(finding, view):
    return finding
