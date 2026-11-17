# -*- coding: utf-8 -*-
"""M09：题录 title/excerpt 必须与 en frontmatter 一致

站方列表页读 submission.json、文章页读 mdx frontmatter；
两处漂移会让列表与正文展示不同标题/摘要。
"""

RULE = "M09"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta", "parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata']}

RATIONALE = {
    RULE: "v1.34 实测（F1）：submission.json 残留旧标题，列表页显示「新标题」、"
                    "正文页显示旧标题，读者点进去以为串稿。en 是唯一被题录承载的语向"
                    "（M09 只比 en），因为站点默认语是 en，其余语向不在题录里出现。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        en_fm = art.en[0]
        if not en_fm:
            continue
        if str(meta.get("title", "")).strip() != str(en_fm.get("title", "")).strip():
            emit(RULE, SEVERITY, art.slug,
                 "submission.json title 与 en frontmatter 不一致"
                 "（列表页与文章页将展示不同标题）")
        if str(meta.get("excerpt", "")).strip() != str(en_fm.get("excerpt", "")).strip():
            emit(RULE, SEVERITY, art.slug,
                 "submission.json excerpt 与 en frontmatter 不一致"
                 "（列表页与文章页将展示不同摘要）")


def review(finding, view):
    return finding
