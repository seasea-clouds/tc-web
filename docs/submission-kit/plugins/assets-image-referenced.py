# -*- coding: utf-8 -*-
"""I06：除封面外每张图都必须在正文被引用

未被引用的图会进包但永不显示，白占体积；封面豁免（列表卡片用）。
"""
import re

RULE = "I06"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images', 'package']}

RATIONALE = {
    RULE: "v1.32 实测：删段落时把图片引用一起删了，图还在 images/ 里，"
                    "题录 images 清单也对得上，机检全绿；直到有人问「这张图怎么没显示」"
                    "才发现。逐语判，因为某语漏引一张图正是最高频形态。",
}


def run(view, emit):
    for art in view.articles:
        pat = re.compile(r"^/images/blog/%s/([^/]+\.webp)$" % re.escape(art.slug))
        for lg in art.langs:
            referenced = set()
            for ln in art.body(lg).split("\n"):
                for m in re.finditer(r"!\[[^\]]*\]\(([^)\s]+)", ln):
                    mm = pat.match(m.group(1))
                    if mm:
                        referenced.add(mm.group(1))
            for name in sorted(art.images):
                if name == "cover.webp":
                    continue
                if name not in referenced:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "图片 %s 未被正文引用" % name)


def review(finding, view):
    return finding
