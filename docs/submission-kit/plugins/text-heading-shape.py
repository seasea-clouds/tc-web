# -*- coding: utf-8 -*-
"""B02：标题必须 `## 空格` 起、层级不超过 ###

`##标题`（缺空格）不渲染成标题；`####` 及以上在小屏会碎成正文。
"""
import re

RULE = "B02"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "`##` 后缺空格时 markdown 原样输出成正文段落，作者以为加了小标题；四级标题在站方移动端样式表里没有定义，渲染出来和正文一样大。C4 早期版本用 `####` 分层，手机上完全看不出结构。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(body.split("\n"), 1):
                if re.match(r"^#{2,6}[^#\s]", ln):
                    emit(RULE, SEVERITY, tag,
                         "第 %d 行标题缺少空格: %s" % (i, ln[:40]))
                if re.match(r"^####+\s", ln):
                    emit(RULE, SEVERITY, tag, "第 %d 行标题层级超过 ###" % i)

def review(finding, view):
    return finding
