# -*- coding: utf-8 -*-
"""P09：韩语正文不出现汉字

现代韩语正文用谚文；混入汉字（무역准入 这类）是漏译或中文残留。
"""
import re

from plugins._shared import fmt_hits
from core.textutil import _line_of

RULE = "P09"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["ko"], "zones": ["body"]}

RATIONALE = {
    RULE: "韩语译稿里出现汉字只有两种原因：从中文母版直接粘了词、或作者用汉字词凑术语。站方韩语页面统一谚文排版，汉字会显示成异体字形，读者视为排版事故；谚文正字法也不接受汉字混排，出现即需逐词核对是否该用固有词。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            if lg != "ko":
                continue
            hits = [(_line_of(body, m.start()), "汉字 %r" % m.group(0))
                    for m in re.finditer(r"[\u4E00-\u9FFF]+", body)]
            if hits:
                emit(RULE, SEVERITY, tag,
                     "韩语正文出现汉字（应改写为谚文）: " + fmt_hits(hits))

def review(finding, view):
    return finding
