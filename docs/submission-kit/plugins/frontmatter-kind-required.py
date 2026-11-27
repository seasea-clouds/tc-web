# -*- coding: utf-8 -*-
"""M10：kind 必填且只能是 blog / regulation

v1.60 起不再默认 blog：缺 kind 直接报，避免博客/法规走错流水线。
"""

RULE = "M10"
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
    RULE: "v1.60 实测：kind 缺省若按 blog 处理，法规稿会走博客的 CTA"
                    "与配图判据，报了一堆无关错误。改为必填后，错误定位从「37 条莫名报错」"
                    "收敛成「kind 没写」一条。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        if art.meta_kind not in ("blog", "regulation"):
            emit(RULE, SEVERITY, art.slug,
                 'kind 必填且只能是 "blog" 或 "regulation"（当前: %r）'
                 % (meta.get("kind"),))


def review(finding, view):
    return finding
