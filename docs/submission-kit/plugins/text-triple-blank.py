# -*- coding: utf-8 -*-
"""P13：不出现三连及以上空行

三连空行会把后续内容切成新块，P21–P27 的块对齐判据随之错位。
"""
import re

from core.consts import TRIPLE_NL_RE

RULE = "P13"
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
    RULE: "批量生成或拼接稿件时空行会累积；块级判据（P21–P27）按空行切块，多余空行直接改变块序号，跨语比对随之全线误报。所以这条是结构稳定性的前置卫生条件，先修空行再看块对齐。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            m = TRIPLE_NL_RE.search(body)
            if m:
                emit(RULE, SEVERITY, tag,
                     "存在三连及以上空行（%d 处）"
                     % len(TRIPLE_NL_RE.findall(body)))

def review(finding, view):
    return finding
