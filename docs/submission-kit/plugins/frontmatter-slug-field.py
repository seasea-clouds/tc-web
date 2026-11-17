# -*- coding: utf-8 -*-
"""F04：frontmatter slug 必须等于条目 slug

逐语判等，不允许某语写自己的变体。
"""

RULE = "F04"
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
    RULE: "v1.15 实测：某语 frontmatter 的 slug 被写成带语种后缀的变体"
                    "（`xxx-de`），站方按 frontmatter slug 建该语路由，文章页 404。"
                    "逐语判等而不是只判 zh，因为译文是独立文件、各自带 slug。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            if art.fm(lg).get("slug") != art.slug:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter slug 必须等于 %s" % art.slug)


def review(finding, view):
    return finding
