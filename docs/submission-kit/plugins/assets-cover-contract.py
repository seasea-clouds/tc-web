# -*- coding: utf-8 -*-
"""I02：必须有 cover.webp 且精确 1200×630

博客强制要封面；尺寸必须是 1200×630（站方列表卡片与社交分享固定比例）。
法规不使用配图，豁免。
"""
from core.consts import COVER_SIZE
from core.pkgio import image_integrity, image_size

RULE = "I02"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images', 'package']}

RATIONALE = {
    RULE: "v1.31 实测：封面用 16:9 图（1600×900），列表卡片被裁掉左右两侧，"
                    "标题压在留白外；另有一篇完全没传 cover，社交分享显示站点默认图。"
                    "1200×630 是站方 og:image 的目标尺寸，判精确值而不是比例，"
                    "因为缩放链路上按像素精确取值。",
}


def run(view, emit):
    for art in view.articles:
        if "cover.webp" not in art.images:
            if not art.is_reg:
                emit(RULE, SEVERITY, art.slug, "缺少 cover.webp")
            continue
        data = art.images["cover.webp"]
        if image_integrity("cover.webp", data):
            continue
        size = image_size("cover.webp", data)
        if not size:
            continue
        if tuple(size) != COVER_SIZE:
            emit(RULE, SEVERITY, art.slug,
                 "cover.webp 必须精确 1200×630，实际 %d×%d" % size)


def review(finding, view):
    return finding
