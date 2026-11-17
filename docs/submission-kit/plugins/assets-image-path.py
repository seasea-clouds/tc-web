# -*- coding: utf-8 -*-
"""I05：正文图片路径必须是 /images/blog/<slug>/<name>.webp

绝对站内路径、目录等于 slug；相对路径与外链由图集装配层丢弃。
"""
import re

RULE = "I05"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images', 'body']}

RATIONALE = {
    RULE: "v1.32 实测：某语正文写成 `../images/x.webp`（相对路径），"
                    "站方图集装配只认 `/images/blog/<slug>/`，正文里出现裂图；"
                    "另有写成 `/images/<slug>/x.webp`（少了 blog 段）同样裂。"
                    "判形状而不是判文件是否存在——存在性由 I06 反向覆盖。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(art.body(lg).split("\n"), 1):
                for m in re.finditer(r"!\[([^\]]*)\]\(([^)\s]+)", ln):
                    alt, url = m.group(1), m.group(2)
                    if re.match(r"^https?://", url):
                        continue
                    mm = re.match(r"^/images/blog/%s/([^/]+\.webp)$"
                                  % re.escape(art.slug), url)
                    if not mm:
                        emit(RULE, SEVERITY, tag,
                             "第 %d 行图片路径应为 /images/blog/%s/<name>.webp"
                             % (i, art.slug))


def review(finding, view):
    return finding
