# -*- coding: utf-8 -*-
"""R12：法规不使用配图——submission.json images 与包内 images/ 都必须为空

法规详情页的主体是官方文本，配图与条文无关；覆盖图还会占掉列表页首屏。
"""
RULE = "R12"
RULES = [RULE]
PHASE = 20
CATEGORY = "assets"
APPLIES_TO = ["regulation"]
NEEDS = ["meta", "images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['metadata', 'images', 'package']}

RATIONALE = {
    RULE: "v1.57 起执行：法规线沿用博客的起手模板，submission.json 里带着 images "
                    "数组与 images/ 目录一起提交，站方按博客口径渲染出「配图区」，"
                    "页面在条文之间插进一张与法规无关的图。两臂分开：清单非空是数据"
                    "问题（改 submission.json），包内有文件是结构问题（P08 类路径"
                    "白名单同时会红，但本条指名「法规不配图」这条业务口径，便于"
                    "改稿人一眼判断该删还是该补说明）。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        meta = art.meta if art.meta_state in ("ok", "empty") else None
        if meta is None:
            continue
        imgs = meta.get("images")
        if isinstance(imgs, list) and imgs:
            emit(RULE, SEVERITY, art.slug, "法规不使用配图，images 必须为空数组")
        files = art.images
        if files:
            emit(RULE, SEVERITY, art.slug,
                 "法规不使用配图，包内不应有 images/：%s"
                 % ", ".join(sorted(files)))


def review(finding, view):
    return finding
