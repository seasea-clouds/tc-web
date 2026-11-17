# -*- coding: utf-8 -*-
"""M06：author 必须固定为站内署名

站方按 author 建作者页，署名漂移会拆出多个作者条目。
"""
from core.consts import AUTHOR

RULE = "M06"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata']}

RATIONALE = {
    RULE: "v1.30 实测：多篇曾用 `David`、`david zhang`、`Yunfan Zhang` 三种写法，"
                    "站方作者页被拆成 3 个。作者是站内固定署名而非自由文本，"
                    "因此判等而不是判非空。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        if meta.get("author") != AUTHOR:
            emit(RULE, SEVERITY, art.slug,
                 "author 必须固定为 %s（当前: %r）" % (AUTHOR, meta.get("author")))


def review(finding, view):
    return finding
