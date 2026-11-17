# -*- coding: utf-8 -*-
"""R24：法规中文母版的中文序号必须用全角括号

官方全文的层级序号「（一）（二）」在中文母版里一律全角；写成半角 `(一)`
在排版、检索与逐块大纲对齐上都与全角版不同形，而且没有其他规则接手
（R22 拦的是行首 `1.` 数字列表块，parity-list-markers 只管译文层）。
"""
import re

RULE = "R24"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程：中文序号只存在于 zh 母版，译文层用各自语言序号
COVERAGE = {"langs": ["zh"], "zones": ["body"]}

RATIONALE = {
    RULE: "站方惯例把官方条文的层级序号统一为全角「（一）（二）」：全角与半角在"
          "中文排版里字面宽度、检索与逐块大纲对齐都不同，半角混入会让后续 P21/P22/"
          "P23 的块对齐与条目计数按不同字符切分。真实 70 包实测 0 命中（31 篇 532 处"
          "全角），本条是防回归口子：此前只有 R22 拦数字列表块、parity-list-markers "
          "管译文层，zh 母版自身的半角序号无人接手。",
}

_CN_ORD_HALF = re.compile(r"\(([一二三四五六七八九十百]+)\)")


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        body = art.body("zh") or ""
        for i, line in enumerate(body.split("\n"), 1):
            m = _CN_ORD_HALF.search(line)
            if m:
                emit(RULE, SEVERITY, "zh/%s" % art.slug,
                     "法规中文母版第 %d 行出现半角括号序号「%s」：中文序号一律"
                     "写全角「（%s）」" % (i, m.group(0), m.group(1)))


def review(finding, view):
    return finding
