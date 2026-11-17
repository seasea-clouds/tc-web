# -*- coding: utf-8 -*-
"""P70：阿拉伯句号 U+06D4 只在 ur 合法（语向纯度）

同一条 U+06D4 在 ar/fa 里是畸形字符（它们的句号是 U+002E / U+06D4 各不同），
在 ur 是正字法。判据只看语向 + 码位，不看语义。
"""
from plugins._language import check_arabic_stop

RULE = "P70"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v2.23 立规（D1 47 语审读 + 全库探针）：ar/fa 正文里出现乌尔都语专用的"
                    "句号 U+06D4，多为从 ur 稿复制串稿；U+06D4 在 ar 里是畸形码位，"
                    "读者看到的是「句子结束符长得不对」。判据条件只由语向 + 码位决定，"
                    "不依赖契约库、不绑篇目锚点；ur 自身整语向豁免（正字法）。",
}


def run(view, emit):
    def _add(rule, sev, loc, detail):
        emit(rule, sev, loc, detail)

    for art in view.articles:
        check_arabic_stop(view, art.parsed, art.slug, _add)


def review(finding, view):
    return finding
