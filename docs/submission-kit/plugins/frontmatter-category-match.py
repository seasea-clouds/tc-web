# -*- coding: utf-8 -*-
"""F06：frontmatter category 与题录一致且在白名单内

两个红面：与题录不一致；博客分类不在白名单。
"""
from core.consts import CATEGORIES

RULE = "F06"
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
    RULE: "v1.15 实测：题录分类改成 `E-commerce` 后 mdx 仍是旧分类，站方按题录"
                    "归类而文章页标签按 mdx 渲染，同一篇挂在两个栏目下。"
                    "白名单那一臂只对博客生效：法规分类另有 R17 在 frontmatter 侧复查。",
}


def run(view, emit):
    for art in view.articles:
        meta_cat = art.meta.get("category")
        for lg in art.langs:
            fm = art.fm(lg)
            if meta_cat and fm.get("category") != meta_cat:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter category 与 submission.json 不一致")
            if (not art.is_reg) and fm.get("category") \
                    and fm.get("category") not in CATEGORIES:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "category 不在白名单")


def review(finding, view):
    return finding
