# -*- coding: utf-8 -*-
"""I08：图片 alt 必须真写且不得笼统

空 alt 与 image/img/图/图片/photo/picture 一类占位词都报。
"""
import re

RULE = "I08"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.32 实测：47 语 alt 全写的 `image`（批量脚本填的占位），"
                    "无障碍朗读退化成「图像」，SEO 也拿不到内容词。笼统词表只收"
                    "明确的占位词，不判长度——部分语言用 2-3 个词就能说清画面。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(art.body(lg).split("\n"), 1):
                for m in re.finditer(r"!\[([^\]]*)\]\(([^)\s]+)", ln):
                    alt, url = m.group(1), m.group(2)
                    mm = re.match(r"^/images/blog/%s/([^/]+\.webp)$"
                                  % re.escape(art.slug), url)
                    if not mm:
                        continue
                    if not alt.strip():
                        emit(RULE, SEVERITY, tag, "第 %d 行图片缺少 alt 文字" % i)
                    elif alt.strip().lower() in {"image", "img", "图", "图片",
                                                 "photo", "picture"}:
                        emit(RULE, SEVERITY, tag,
                             "第 %d 行 alt 过于笼统: %r" % (i, alt))


def review(finding, view):
    return finding
