# -*- coding: utf-8 -*-
"""S04：路径形状 —— content/<lang>/<slug>.mdx 与 images/<slug>/<name>.webp。

只判形状是否可解析、目录名/文件名是否等于 slug；语言码合法性归 S03，
位置白名单归 S10，后缀归 S05。
"""
from core.view import IMAGE_PATH_RE

RULE = "S04"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["mdx", "images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package']}

RATIONALE = {
    RULE: "v1.22 实测：content/ 下出现过 <slug>.md 与 <slug>-v2.mdx 两种漂移，"
          "S10 只认「content/<lang>/<slug>.mdx」位置白名单，但形状不可解析的文件"
          "在 S10 里与「多余文件」混为一谈，修复方向被误导成删文件。"
          "图片侧同理：images/ 下曾出现 <其它slug>/fig-01.webp，站点按 slug 装配图集时静默丢图。",
}


def run(view, emit):
    for art in view.articles:
        slug = art.slug
        for tail in art.mdx_bad_path:
            emit(RULE, SEVERITY, slug,
                 "mdx 路径应为 content/<lang>/<slug>.mdx，发现: %s" % tail)
        for lg in art.name_mismatch:
            emit(RULE, SEVERITY, slug,
                 "文件名必须等于 slug（%s），发现 %s.mdx" % (slug, lg))
        for tail in art.webp_tails:
            m = IMAGE_PATH_RE.match(tail)
            if not m:
                emit(RULE, SEVERITY, slug,
                     "图片路径应为 images/<slug>/<name>.webp，发现: %s" % tail)
            elif m.group(1) != slug:
                emit(RULE, SEVERITY, slug, "图片目录必须等于 slug，发现: %s" % tail)


def review(finding, view):
    return finding
