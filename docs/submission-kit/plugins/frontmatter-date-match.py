# -*- coding: utf-8 -*-
"""F05：frontmatter date 必须与 submission.date 一致

题录有 date 时才判（法规无 date，由 R23 比对 published_at）。
"""

RULE = "F05"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata']}

RATIONALE = {
    RULE: "v1.15 实测：题录 date 改成新日期后漏改 47 个 mdx，列表页按题录排序、"
                    "文章页显示旧日期，同一篇出现两个发布日期。只判博客是因为法规的"
                    "日期语义分 published_at/effective_at 两个字段，由 R23 逐语对齐。",
}


def run(view, emit):
    for art in view.articles:
        meta_date = art.meta.get("date")
        if not meta_date:
            continue
        for lg in art.langs:
            if art.fm(lg).get("date") != meta_date:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter date 与 submission.json 不一致")


def review(finding, view):
    return finding
