# -*- coding: utf-8 -*-
"""P41：表格前的包名清单必须与表格 S1–S13 逐字一致

表前 13 条包名与表格行逐字对齐；写成「两项检查」而表格有 13 行，读者按清单
点不到对应行。没有 S0–S13 表的篇目直接跳过。
"""
from plugins._lang import _p41_table_bullet_errors

RULE = "P41"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.42 实测（C1 篇）：正文清单写「S1–S13 共 13 项」，而表前 bullet 只列了"
                    "9 条（漏 S6–S9），读者按清单核对表格会发现对不上号。判据把表前"
                    "13 条 bullet 与表格 S1–S13 行逐字比对（归一空白与标点差异），"
                    "对不上即报。没有该表的篇目直接跳过，不产生噪声。",
}


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            for msg in _p41_table_bullet_errors(art.body(lg) or ""):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), msg)


def review(finding, view):
    return finding
