# -*- coding: utf-8 -*-
"""I01：图片载荷必须完整可解析

RIFF 声明长度与 chunk 边界、PNG 的 IEND、JPEG 的 EOI 都要成立；
载荷不完整或尺寸解析不出来即报。
"""
from core.pkgio import image_integrity, image_size

RULE = "I01"
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
    RULE: "v1.28 实测（REG5 配图批）：一张 webp 由工具导出时被截断（RIFF 声明"
                    "大于实际字节），站点 CDN 返回 200 但解码失败，读者只看到空白框；"
                    "文件大小与后缀都正常，只有载荷结构能识破。截断与「能读头不能读尺寸」"
                    "两种形态合并成一条，因为修复动作同源：重新导出。",
}


def run(view, emit):
    for art in view.articles:
        for name, data in sorted(art.images.items()):
            broken = image_integrity(name, data)
            if broken:
                emit(RULE, SEVERITY, art.slug,
                     "%s 图像载荷不完整: %s" % (name, broken))
                continue
            if not image_size(name, data):
                emit(RULE, SEVERITY, art.slug,
                     "%s 无法解析尺寸（文件可能损坏）" % name)


def review(finding, view):
    return finding
