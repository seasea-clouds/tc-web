# -*- coding: utf-8 -*-
"""P21：分节列表项数必须与母版一致

按小节比对列表条目数；章节集合不同也归本条。
历史事故：部分语言把「九个板块」压成一段散文，信息层级与母版不同。
"""

from core.textutil import _block_misalign_hints, section_list_counts

RULE = "P21"
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
    RULE: "v1.72 实测（C1 47 语）：bg/es/it 把「三项检查」的列表压成一段散文，"
                    "读者看到的信息层级与母版不同，篇幅也随之缩水 30%；P23 只比块类型"
                    "与规模，整段合并后块数变化会被 P22 报成「顺序错位」，方向误导。"
                    "本条按小节汇总列表项数，直接指出「第几节 3≠1」。「章节集合不同」"
                    "合并进同一条，因为修复动作同源：把该语言的结构补回母版形状。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = section_list_counts(art.master_body)
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            body = art.body(lg)
            cur = section_list_counts(body)
            if set(base) != set(cur):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "小节结构与 %s 不一致（章节集合不同）%s"
                     % (ml, _block_misalign_hints(body)))
                continue
            off = [(sec, base[sec], cur[sec]) for sec in base
                   if base[sec] != cur[sec]]
            if off:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "分节列表项数与 %s 不一致: %s%s"
                     % (ml, ", ".join("第%s节 %d≠%d" % o for o in off[:6]),
                        _block_misalign_hints(body)))


def review(finding, view):
    return finding
