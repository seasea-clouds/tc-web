# -*- coding: utf-8 -*-
"""P44：韩语阿拉伯数字与量词「개」之间不得空格（应写作 14개）

韩语量词黏着在数字后；空格是英文「14 items」逐字直译的残留。
"""
from plugins._lang import _p44_ko_counter_hits
from plugins._shared import fmt_hits

RULE = "P44"
RULES = [RULE]
PHASE = 40
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["ko"], "zones": ['body']}

RATIONALE = {
    RULE: "v1.42 实测（C3 ko）：正文写「14 개 품목」，韩语正字法要求 14개 黏写；"
                    "空格是英文「14 items」逐字直译的残留，韩国读者一眼看出是机翻。"
                    "判据只认「阿拉伯数字 + 空格 + 개」，汉字数词（열네 개）本就有空格，"
                    "不在射程。射程锁 ko。",
}


def run(view, emit):
    for art in view.articles:
        if "ko" not in art.parsed:
            continue
        hits = _p44_ko_counter_hits(art.body("ko") or "")
        if hits:
            emit(RULE, SEVERITY, "ko/%s" % art.slug,
                 "韩语阿拉伯数字与量词「개」之间不应空格（应写作 14개）: "
                 + fmt_hits([(ln, "%r" % w) for ln, w in hits]))


def review(finding, view):
    return finding
