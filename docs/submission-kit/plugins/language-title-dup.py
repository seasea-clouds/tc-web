# -*- coding: utf-8 -*-
"""L06：title/excerpt 跨语言完全相同（L01/L02 只比英文，此处覆盖其余语言互抄）

一个语向直接抄另一个语向的标题与摘要（非英文互抄），站方会显示两个同名条目。
"""
RULE = "L06"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.19 实测：L01/L02 只比「与本语对应英文是否相同」，两个小语种互抄"
                    "（ca 抄 es、no 抄 da）时两条全绿，站方列表页出现两个同名条目。"
                    "本条按 (title, excerpt) 组成对比较：任一对完全相同即报，且一次报出"
                    "整组语向。title 为空不参与（缺字段由 F02 管）。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        seen = {}
        for lg in sorted(art.parsed):
            fm = art.fm(lg) or {}
            key = (str(fm.get("title", "")).strip(),
                   str(fm.get("excerpt", "")).strip())
            if key[0]:
                seen.setdefault(key, []).append(lg)
        for key, lgs in sorted(seen.items()):
            if len(lgs) > 1:
                emit(RULE, SEVERITY, art.slug,
                     "title/excerpt 完全相同（疑似未翻译）: %s" % ",".join(lgs))


def review(finding, view):
    return finding
