# -*- coding: utf-8 -*-
"""P25：列表标记与缩进层级必须与母版一致

列表符号（- / * / + / 1. / 1)）与缩进空格数逐条比对。同一份内容在部分语言里
用星号、另一语言用短横线，或用数字列表，渲染出的层级感与编号含义都不同。
"""
from core.textutil import _blocks_by_kind

RULE = "P25"
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
    RULE: "自 v1.18 起实测：法规条文的「（一）（二）」层级在译文里被写成 1./2. "
                    "数字列表，母版是无序短横线——条目数一致（P21 绿）、块类型一致"
                    "（P23 绿），但渲染后数字编号暗示了先后顺序，且缩进少两格导致子项"
                    "被渲染成同级。本条同时比对标记种类序列与每行缩进空格数，"
                    "把「符号换了」和「层级塌了」两种缺陷合并成一个可定位的判据。",
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
            pair = _blocks_by_kind(art.outline(lg)).get("LIST", [])
            for n, (_bi, d) in enumerate(base.get("LIST", [])):
                if n >= len(pair):
                    continue
                _ci, cd = pair[n]
                if cd[1] != d[1]:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d个列表 列表符号与 %s 不一致：基准 %s，本语言 %s"
                         % (n + 1, ml,
                            "/".join(d[1]) or "-", "/".join(cd[1]) or "-"))
                if cd[2] != d[2]:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d个列表 缩进层级与 %s 不一致：基准 %s，本语言 %s"
                         % (n + 1, ml,
                            "/".join(str(x) for x in d[2]),
                            "/".join(str(x) for x in cd[2])))


def review(finding, view):
    return finding
