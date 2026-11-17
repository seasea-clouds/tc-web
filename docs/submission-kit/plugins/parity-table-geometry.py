# -*- coding: utf-8 -*-
"""P24：表格几何必须与母版逐表一致

按表格出现顺序配对（基准第 n 张表 对 本语第 n 张表），比对列数与每一行的
列数。某语少写一列、或只在某一行漏掉一个单元格，渲染后整表错行；P23 只比
块类型与行数，看不见列几何。
"""
from core.textutil import _blocks_by_kind

RULE = "P24"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master", "outline"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "自 v1.15 起在法规表格篇目上反复抓到：某语申报要素表少写一列，"
                    "或表头 4 列、正文某一行只有 3 个单元格（列数检查看不见单行错位）。"
                    "markdown 表格列数不齐时渲染器按行补齐，整表右移一列，"
                    "要素名与要素值串位——这类错在 P23 逐块大纲里只是「表格行数相同」，"
                    "完全沉默。配对用「同类型第 n 个」，因此别处增删块不会连带误报。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = _blocks_by_kind(art.outline(ml))
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            pair = _blocks_by_kind(art.outline(lg)).get("TABLE", [])
            for n, (_bi, d) in enumerate(base.get("TABLE", [])):
                if n >= len(pair):
                    continue
                _ci, cd = pair[n]
                if cd[1] != d[1]:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d张表 列数与 %s 不一致：基准 %s，本语言 %s"
                         % (n + 1, ml, d[1], cd[1]))
                if cd[2] != d[2]:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d张表 各行列数与 %s 不一致：基准 %s，本语言 %s"
                         % (n + 1, ml,
                            "/".join(str(x) for x in d[2]),
                            "/".join(str(x) for x in cd[2])))


def review(finding, view):
    return finding
