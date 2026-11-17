# -*- coding: utf-8 -*-
"""P23：逐块大纲必须与母版一一对应

位置、类型、规模（列表条目数/图片文件名/表格行数/标题层级）逐块对齐；
这是「一比一结构」的最终判据。
"""

from core.textutil import outline_diff

RULE = "P23"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.72 实测：某语把两个列表合并成一个（条目数对、顺序也对），"
                    "P21/P22 全绿，但逐块规模已变——本站按块渲染目录锚点，合并后锚点位置"
                    "整体偏移。P23 落到每一块的规模，是唯一能发现「块被合并/拆分」的判据。"
                    "大纲用 view.outline() 缓存，P21–P27 七条共用一次计算。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = art.outline(ml)
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = art.outline(lg)
            if cur == base:
                continue
            diffs = outline_diff(base, cur)
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "逐块结构与 %s 不一致（%d 处）: %s"
                 % (ml, len(diffs), "; ".join(diffs[:8])))


def review(finding, view):
    return finding
