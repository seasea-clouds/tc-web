# -*- coding: utf-8 -*-
"""B06：正文禁止框线字符流程图

`┌─┐` 一类制表符在移动端与 RTL 语向下必然错位，且屏幕阅读器读成乱码。
"""
import re

RULE = "B06"
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
    RULE: "框线字符宽度依字体而定，48 语混排时列必然对不齐；站方也不给等宽字体，流程图应改成编号步骤或表格。RTL 语向下框线还会被双向算法打乱顺序，屏幕阅读器读出来是乱码。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            if re.search(r"[\u2500-\u257F]", body):
                emit(RULE, SEVERITY, tag, "正文含框线字符流程图")

def review(finding, view):
    return finding
