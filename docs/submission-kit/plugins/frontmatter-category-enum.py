# -*- coding: utf-8 -*-
"""M05：category 必须在站内分类枚举内

博客用 CATEGORIES，法规用 REG_CATEGORIES。分类决定站内导航位置，
写错等于文章挂到了不存在的栏目。
"""
from core.consts import CATEGORIES, REG_CATEGORIES

RULE = "M05"
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
    RULE: "v1.30 实测：某篇 category 写成 `Compliance`（少了 Guide），"
                    "站方按分类建目录时静默丢文章。法规侧另有一套分类枚举（R17 复查），"
                    "两条判据同时存在是有意的：M05 是题录格式，R17 是法规语义档案。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        if art.is_reg:
            cat = str(meta.get("category") or "")
            if cat and cat not in REG_CATEGORIES:
                emit(RULE, SEVERITY, art.slug,
                     "法规 category 必须是 %s 之一（当前 %r）"
                     % (" / ".join(REG_CATEGORIES), cat))
        elif meta.get("category") not in CATEGORIES:
            emit(RULE, SEVERITY, art.slug,
                 "category 必须是: %s" % " / ".join(CATEGORIES))


def review(finding, view):
    return finding
