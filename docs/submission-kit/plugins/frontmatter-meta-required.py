# -*- coding: utf-8 -*-
"""M02：submission.json 必填字段齐全

9 个必填字段逐个点名（法规无 date，博客必有 date）；
imageRights 单独判空——它决定配图能否商用。
"""

RULE = "M02"
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
    RULE: "v1.30 实测：必填校验若放在 `if meta:` 内，空对象会直接绕过；"
                    "另有一次 imageRights 传了空串（模板占位没改），站点法务退回。"
                    "逐个字段点名而不是报「字段缺失」，是因为 9 个字段里补哪一个完全不同，"
                    "笼统报错会让作者回来问一轮。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        req = ["kind", "slug", "title", "category", "author", "excerpt",
               "locales", "images", "imageRights"]
        if not art.is_reg:
            req.insert(3, "date")
        for k in req:
            if k not in meta:
                emit(RULE, SEVERITY, art.slug,
                     "submission.json 缺少字段 %s" % k)
        if not str(meta.get("imageRights", "")).strip():
            emit(RULE, SEVERITY, art.slug,
                 "imageRights 不能为空（需确认可商用）")


def review(finding, view):
    return finding
