# -*- coding: utf-8 -*-
"""P05：正文不出现省略号（… / ...）

正式商务稿的省略号多为残句或机翻截断，读者会以为话没说完。
"""
import re

from plugins._shared import fmt_hits
from core.textutil import _line_of
from core.consts import ELLIPSIS_RE

RULE = "P05"
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
    RULE: "省略号在正式稿件里几乎只有两种来源：作者写残句、机翻把半句吞掉；站方回执要求整句写完，不能用省略号制造悬念。与 P17（整句重复）同属「拼接事故」族：一个吞半句、一个重复整句，都是批量产稿的痕迹。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            hits = [(_line_of(body, m.start()), "%r（疑似残句，请通读该句）" % m.group(0))
                    for m in ELLIPSIS_RE.finditer(bare)]
            if hits:
                emit(RULE, SEVERITY, tag, "出现省略号: " + fmt_hits(hits))

def review(finding, view):
    return finding
