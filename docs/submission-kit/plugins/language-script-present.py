# -*- coding: utf-8 -*-
"""L03：正文未使用该语言的文字系统（疑似英文回退）

用 SCRIPT_TESTS 里该语向的正字法正则扫 title + excerpt + 正文；
一个都匹配不上，说明整篇是别的文字系统。
"""
import re

from core.consts import SCRIPT_TESTS

RULE = "L03"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "scripted", "zones": ['frontmatter', 'body']}

RATIONALE = {
    RULE: "v1.34 实测：某语 mdX 整篇是英文复制（脚本没跑成，留下英文占位），"
                    "S02 只数文件存在、L01/L02 只比题录，全绿进包。文字系统判据是"
                    "最后一道结构性防线：它不判译得好不好，只判「是不是这门语言的字」。"
                    "正则表在 SCRIPT_TESTS，小语种（ka/hy/ti 等）必须先核表再加语向。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            pat = SCRIPT_TESTS.get(lg)
            if not pat:
                continue
            fm = art.fm(lg)
            blob = " ".join([str(fm.get("title") or ""),
                             str(fm.get("excerpt") or ""), art.body(lg)])
            if not re.search(pat, blob):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "正文未使用该语言的文字系统（疑似英文回退）")


def review(finding, view):
    return finding
