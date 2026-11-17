# -*- coding: utf-8 -*-
"""R17：法规 category 必须是固定集合（题录 + 逐语 frontmatter）

法规分类是站方导航的一级筛选条件，自由文本会让同一条法规落进不同栏目。
"""
from core.consts import REG_CATEGORIES

RULE = "R17"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["meta", "parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['metadata', 'frontmatter']}

RATIONALE = {
    RULE: "v1.57 建立法规分类时实测：早期把 category 写成「海关公告」「进出口」"
                    "这类自由文本，站方导航按 REG_CATEGORIES 固定集合生成筛选器，"
                    "写外的值不进任何栏目，读者从导航里找不到该法规。两臂都判：题录是"
                    "导航数据源，逐语 frontmatter 是页面标签数据源，只对齐一处仍会"
                    "出现「导航里有、页面标签空」。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        if art.meta_state in ("ok", "empty"):
            cat = str(art.meta.get("category") or "").strip()
            if cat and cat not in REG_CATEGORIES:
                emit(RULE, SEVERITY, art.slug,
                     "法规 category 必须是 %s 之一（当前 %r）"
                     % (" / ".join(REG_CATEGORIES), cat))
        for lg in sorted(art.parsed):
            fv = str((art.fm(lg) or {}).get("category") or "").strip()
            if fv and fv not in REG_CATEGORIES:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "category 必须是 %s 之一（当前 %r）"
                     % (" / ".join(REG_CATEGORIES), fv))


def review(finding, view):
    return finding
