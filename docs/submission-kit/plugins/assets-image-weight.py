# -*- coding: utf-8 -*-
"""I04：单张图片不得超过 400KB

逐图判体积并给出实际 KB；超重图会拖慢首屏。
"""
from core.consts import MAX_IMAGE_BYTES

RULE = "I04"
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
    RULE: "v1.31 实测：一张未压缩的截图 1.2MB，移动端首屏 6 秒；"
                    "站方没有自动压缩链路，超重图直接发布。400KB 是按 48 语"
                    "文章页各带 2-3 图估算的整页预算分摊值。",
}


def run(view, emit):
    for art in view.articles:
        for name, data in sorted(art.images.items()):
            if len(data) > MAX_IMAGE_BYTES:
                emit(RULE, SEVERITY, art.slug,
                     "%s 超过 400KB（%.0fKB）" % (name, len(data) / 1024.0))


def review(finding, view):
    return finding
