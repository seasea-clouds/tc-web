# -*- coding: utf-8 -*-
"""P58：句末标记之后不得以小写开头

句号/问号/叹号/分号之后，本语应有句首大写。缩写表（e.g. / i.e. / No.）与
无大小写概念的文字系统（ka/hy 的部分形态）有单独豁免。法规线 error、博客线
warning——博客的 hy 存量欠账归博客线自己改稿。
"""
import re

from core.consts import _MD_PH
from plugins._health import _p58_case_hits, _p58_message

RULE = "P58"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.75 立规（REG2 hy 实证 11 处、F3 hy 存量 3 处）：句号后紧跟小写开头，"
                    "是本语正字法硬伤，读者第一眼就看出「这句是拼上去的」。三臂口径"
                    "（分号/缩写/代码围栏）与开普兰语系的大小写规则见常量处 P58 注释。"
                    "分档理由同 P56：法规线 error（译本没有「刻意的全小写」这种写法），"
                    "博客线 warning——存量欠账归博客线自己排期修。",
}


def run(view, emit):
    for art in view.articles:
        sev = "error" if art.is_reg else "warning"
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", _MD_PH, body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", _MD_PH, bare)
            hits = _p58_case_hits(bare, lg)
            if hits:
                emit(RULE, sev, "%s/%s" % (lg, art.slug),
                     "句末标记后小写开头（本语应有句首大写）: "
                     + _p58_message(hits))


def review(finding, view):
    return finding
