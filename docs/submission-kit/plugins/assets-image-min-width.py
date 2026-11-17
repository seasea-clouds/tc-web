# -*- coding: utf-8 -*-
"""I03：正文配图宽度不得小于 1200

只判非封面图；宽度不足会在正文里被拉成模糊块。
"""
from core.consts import MIN_IMAGE_WIDTH
from core.pkgio import image_integrity, image_size

RULE = "I03"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images']}

RATIONALE = {
    RULE: "v1.31 实测：正文图用 800px 宽的截图，站点按 1200px 容器渲染，"
                    "放大后文字发虚，读者反馈看不清表格。1200 与封面宽度同源，"
                    "避免同一篇里出现两种显示宽度。",
}


def run(view, emit):
    for art in view.articles:
        for name, data in sorted(art.images.items()):
            if name == "cover.webp" or image_integrity(name, data):
                continue
            size = image_size(name, data)
            if not size:
                continue
            w, _h = size
            if w < MIN_IMAGE_WIDTH:
                emit(RULE, SEVERITY, art.slug,
                     "%s 宽度 %d < 1200" % (name, w))


def review(finding, view):
    return finding
