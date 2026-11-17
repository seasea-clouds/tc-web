# -*- coding: utf-8 -*-
"""M03：submission.json 的 slug 与目录名一致

只比一处：题录 slug 与目录名。目录名是 site 路由的唯一来源。
"""

RULE = "M03"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata', 'package']}

RATIONALE = {
    RULE: "v1.30 实测：复制旧条目起手时目录改了名、题录 slug 忘改，"
                    "站方按题录 slug 建路由，文章页 404 而列表页正常。"
                    "允许 meta 不写 slug（None）——S13/M02 已覆盖必填，本条只管不一致。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        if meta.get("slug") not in (None, art.slug):
            emit(RULE, SEVERITY, art.slug,
                 "submission.json 的 slug 与目录名不一致")


def review(finding, view):
    return finding
