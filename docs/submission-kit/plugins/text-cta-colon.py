# -*- coding: utf-8 -*-
"""P12：CTA 不得用冒号引出链接

`Contact us: [..](/xx/packages/)` 这种冒号式 CTA 是模板化写法，应把链接内嵌进句子。
"""
import re

from plugins._shared import fmt_hits
from core.consts import CTA_COLON_RE

RULE = "P12"
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
    RULE: "站方回执明确要求 CTA 自然融入最后一句（如「如需核对清单，请[联系我们]」），冒号加链接是早期模板残留；改法是重写句子而不是删链接，故只报 warning。链接本身的正误由 B09 判，两条分工不重叠。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            hits = [(i, "CTA 用冒号引出链接")
                    for i, ln in enumerate(body.split("\n"), 1)
                    if CTA_COLON_RE.search(ln)]
            if hits:
                emit(RULE, SEVERITY, tag, fmt_hits(hits))

def review(finding, view):
    return finding
