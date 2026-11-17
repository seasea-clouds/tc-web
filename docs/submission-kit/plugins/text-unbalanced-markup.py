# -*- coding: utf-8 -*-
"""P16：强调符与圆括号必须配对

`**` 奇数个或括号不成对，通常是漏改、截断或替换脚本吃掉半个符号。
"""
import re


RULE = "P16"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "markdown 的 `**` 不配对会渲染成字面星号；括号不配对多半是批量替换把 `)` 换成了别的字符或半角全角混用。两者都是「肉眼难查、渲染才炸」的形状，按计数直接判，不猜语义。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            if body.count("**") % 2:
                emit(RULE, SEVERITY, tag, "** 强调符数量为奇数（不配对）")
            if body.count("(") != body.count(")"):
                emit(RULE, SEVERITY, tag,
                     "圆括号不配对（( %d 个 / ) %d 个）"
                     % (body.count("("), body.count(")")))

def review(finding, view):
    return finding
