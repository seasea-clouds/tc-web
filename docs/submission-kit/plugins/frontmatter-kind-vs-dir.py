# -*- coding: utf-8 -*-
"""M11：kind 必须与所在目录一致

blog/ 下必须 blog，regulation/ 下必须 regulation。
"""

RULE = "M11"
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
    RULE: "v1.63 硬切换实测：法规稿放在 blog/ 目录、题录写 kind=regulation，"
                    "打包时按目录归到博客线，交付清单与实际内容不符。"
                    "目录与题录是两处独立声明，必须对齐才算同一件事。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        if art.meta_kind and art.meta_kind != art.kind_dir:
            emit(RULE, SEVERITY, art.slug,
                 '目录 %s/ 下的稿件 kind 必须是 "%s"（当前: %r）'
                 % (art.kind_dir, art.kind_dir, meta.get("kind")))


def review(finding, view):
    return finding
