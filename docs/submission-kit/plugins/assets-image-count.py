# -*- coding: utf-8 -*-
"""W03：配图数量建议不超过 6 张

只报 warning：超过 6 张时首屏与图集装配会明显变慢。
"""
from core.consts import MAX_IMAGES_WARN

RULE = "W03"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["images"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images', 'body']}

RATIONALE = {
    RULE: "v1.44 实测：某篇 11 张图，移动端滚动到第 4 张开始出现白块"
                    "（懒加载排队）。6 张是按站方图集装配的预取队列长度定的经验值，"
                    "因此只给 warning——内容确实需要更多图时不应阻断交付。",
}


def run(view, emit):
    for art in view.articles:
        n = len(art.images)
        if n > MAX_IMAGES_WARN:
            emit(RULE, SEVERITY, art.slug,
                 "图片数量 %d，建议 ≤%d" % (n, MAX_IMAGES_WARN))


def review(finding, view):
    return finding
