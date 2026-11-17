# -*- coding: utf-8 -*-
"""F03：标题形态（空值 / 超长 / 分隔符形状）

只禁「作分隔用」的标点：词内连字符（e-commerce）、数字区间（2–4）、数字之间的
冒号（比例/时间）放行；副标题冒号、破折号、贴空白连字符判红。
"""
from plugins._title import title_shape_errors

RULE = "F03"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.41 立规：标题写成「Title - Subtitle」时，列表页卡片按 en dash 截断，"
                    "副标题挤到第二行且字号不一致；另有标题用冒号做副标题分隔（与站方"
                    "「标题不设副标题」的版式冲突）。放行口径经过两轮误伤修正：e-commerce "
                    "的词内连字符、2–4 的数字区间、10:30 的数字冒号都合法，一律禁会把"
                    "正确标题判红。亚美尼亚 ֊、希伯来 ־ 等文字系统自带词内连字符不在"
                    "射程（不在 TITLE_HYPHENS 表内）。",
}


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            title = (art.fm(lg) or {}).get("title", "")
            for msg in title_shape_errors(title):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), msg)


def review(finding, view):
    return finding
