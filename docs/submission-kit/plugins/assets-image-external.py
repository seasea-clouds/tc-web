# -*- coding: utf-8 -*-
"""I07：正文图片不得使用外链

http(s) 绝对地址一律报：外链不受控、会失效、且站点图集装配不收。
"""
import re

RULE = "I07"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images', 'body']}

RATIONALE = {
    RULE: "v1.32 实测：某语正文直接嵌了图床链接，图床三个月后 403，"
                    "整篇配图全裂且无人察觉。外链与「路径不对」分开成两条，"
                    "是因为修复动作不同：前者要把图下载进包，后者只改路径。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(art.body(lg).split("\n"), 1):
                for m in re.finditer(r"!\[([^\]]*)\]\(([^)\s]+)", ln):
                    alt, url = m.group(1), m.group(2)
                    if re.match(r"^https?://", url):
                        emit(RULE, SEVERITY, tag,
                             "第 %d 行图片使用了外链: %s" % (i, url))


def review(finding, view):
    return finding
