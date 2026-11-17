# -*- coding: utf-8 -*-
"""F07：excerpt 长度上限且不得等于 title

185 字符上限；摘要是标题的复读等于没写摘要。
"""
from core.consts import MAX_EXCERPT

RULE = "F07"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.15 实测：某语摘要 300+ 字符（把首段整段粘进 excerpt），"
                    "列表页卡片被撑破；另一语摘要与标题逐字相同，列表页标题重复两遍。"
                    "两个红面合并成一条，是因为修复动作同源：重写这行摘要文案。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            fm = art.fm(lg)
            title = str(fm.get("title") or "")
            excerpt = str(fm.get("excerpt") or "")
            if len(excerpt) > MAX_EXCERPT:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "excerpt 超长（%d > %d）" % (len(excerpt), MAX_EXCERPT))
            if excerpt and excerpt.strip() == title.strip():
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "excerpt 不能与 title 相同")


def review(finding, view):
    return finding
