# -*- coding: utf-8 -*-
"""L04：非中日韩语种出现中文字符（疑似中文回退）

非 CJK 语向的 title/excerpt/正文里出现 U+4E00–U+9FFF 即报。
中文字符在拉丁/西里尔/阿拉伯语正文里没有合法出现场景。
"""
import re

from core.consts import CJK_LANGS

RULE = "L04"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'body']}

RATIONALE = {
    RULE: "v1.34 实测：某批拉丁语向正文里残留整句中文（母版段落没删干净就"
                    "往下翻），S08 术语契约只查锚点块，锚不到的块完全失守。"
                    "CJK 字符集在非中日韩语里是硬信号，误报率接近 0（越南语用国语字，"
                    "韩语用谚文，都不落在这个区间）。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            if lg in CJK_LANGS:
                continue
            fm = art.fm(lg)
            blob = " ".join([str(fm.get("title") or ""),
                             str(fm.get("excerpt") or ""), art.body(lg)])
            if re.search(r"[\u4E00-\u9FFF]", blob):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "非中日韩语种出现中文字符（疑似中文回退）")


def review(finding, view):
    return finding
