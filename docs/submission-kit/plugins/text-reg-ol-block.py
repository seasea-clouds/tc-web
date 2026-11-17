# -*- coding: utf-8 -*-
"""R22：法规正文（母版与全部译文）禁用数字列表块

站方惯例把官方「1.」序号规范为（N）全角括号形。数字列表块一旦进正文，
P21/P22/P23 会因序号形态差别连锁返工，必须在母版阶段就拦住。
"""
from core.consts import _OL_RE

RULE = "R22"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.87 立规（REG8 实证）：初版 22 个有序列表块（「1. 2. 3.」）引发 "
                    "P25 列表符号、P23 逐块大纲、P21 条目数三族连锁返工，改一遍要动 "
                    "48 个语向。v2.00 扩到全部译文：REG10 hu 落款「2025. december (2)」"
                    "被旧口径 \\d{1,2} 漏放，靠结构对齐连环误报才暴露——正则与 _OL_RE "
                    "（\\d+ 任意位数）对齐，年份打头的日期行同样拦。博客线不受影响"
                    "（APPLIES_TO 已限 regulation）。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            lines = [i for i, ln in enumerate(body.split("\n"), 1)
                     if _OL_RE.match(ln)]
            if lines:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "法规译文第 %s 行出现数字列表块（站方惯例：官方 \"1.\" 序号"
                     "规范为（N）形，参见 REG1/2/7/8/10 已交付各语）"
                     % ", ".join(str(n) for n in lines[:6]))


def review(finding, view):
    return finding
