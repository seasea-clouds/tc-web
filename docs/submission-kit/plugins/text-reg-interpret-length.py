# -*- coding: utf-8 -*-
"""R21：法规解读段篇幅硬上限

法规页主体是官方文本，解读只做提要。按可见字符计（剔除空白与 markdown 标记）：
CJK 300 字、其他语言 1000 字符。超出说明解读抢了官方文本的位置。
"""
import re

from core.consts import (
    ORIGINAL_MARKER, REG_INTERPRET_MAX_CJK, REG_INTERPRET_MAX_OTHER,
)

RULE = "R21"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.66 立规：早期用「解读不得超过全文一半」判，全文很短时（只有三条"
                    "公告）解读写 400 字仍达标，页面却变成「我们讲的比条文还多」。改为"
                    "绝对字数上限：基准是已发布条款解读 698 字的一半≈349，取整 300 字"
                    "（CJK）/1000 字符（其他语言，按同篇实测等义篇幅折算）。按可见字符"
                    "计、剔除空白与 markdown 标记，避免装饰符号把篇幅判长。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            if body.count(ORIGINAL_MARKER) != 1:
                continue                       # R10/R11 管标记本身
            head = body.split(ORIGINAL_MARKER, 1)[0]
            if not head.strip():
                continue
            h_len = len(re.sub(r"[\s\*_`#>\-\[\]()]", "", head))
            limit = (REG_INTERPRET_MAX_CJK if lg in ("zh", "ja", "ko")
                     else REG_INTERPRET_MAX_OTHER)
            if h_len > limit:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "解读段过长：%d 字符 > 上限 %d 字符"
                     "（法规页主体是官方文本，解读只做提要）" % (h_len, limit))


def review(finding, view):
    return finding
