# -*- coding: utf-8 -*-
"""P34：非 CJK 语向不出现全角标点

全角逗号/句号出现在拉丁、阿拉伯、西里尔语向，是翻译工具或编辑器残留。
"""
import re

from plugins._shared import fmt_hits
from core.textutil import _line_of
from core.consts import CJK_LANGS, FULLWIDTH_PUNCT_RE

RULE = "P34"
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
    RULE: "zh/ja/ko 用全角标点是正字法；其余语向出现全角标点只有一种来源——从中文母版直接复制未替换。站方字体对全角标点的宽度处理与半角不同，整段会参差不齐，且检索按半角匹配，全角标点会让长句搜不到。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            if lg in CJK_LANGS:
                continue
            hits = [(_line_of(body, m.start()), "%r" % m.group(0))
                    for m in FULLWIDTH_PUNCT_RE.finditer(bare)]
            if hits:
                emit(RULE, SEVERITY, tag,
                     "非 CJK 语言出现全角标点: " + fmt_hits(hits))

def review(finding, view):
    return finding
