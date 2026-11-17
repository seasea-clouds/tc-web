# -*- coding: utf-8 -*-
"""P28：frontmatter 结构必须与母版一致

references 条目数、references 的 URL 序列、date 与 category 逐语对齐。漏一条
参考法规会让站点引用关系与归档日期错位。
"""
RULE = "P28"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "自 v1.12 起实测：某语 references 少一条法规（正文引用了、文末没列），"
                    "站点结构化数据只认母版 URL，读者在该语页面看不到被引公告；"
                    "另有语向把 date 写成另一个日期，列表页排序与文章页日期分叉。"
                    "条目数与 URL 序列分两臂：条数相同但顺序被调换也要报，因为"
                    "文末编号 [1][2] 与正文角标一一对应。与 F05/F06 不重叠——"
                    "那两条比的是「与题录 submission.json 一致」，本条比的是「与母版"
                    "语向一致」，题录本身写错时只有那两条会响。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base_fm = art.fm(ml) or {}
        base_refs = base_fm.get("references") or []
        base_urls = tuple(str(r.get("url", "")).strip() for r in base_refs)
        base_date = str(base_fm.get("date", "")).strip()
        base_cat = str(base_fm.get("category", "")).strip()
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur_fm = art.fm(lg) or {}
            cur_refs = cur_fm.get("references") or []
            if len(cur_refs) != len(base_refs):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "references 条目数与 %s 不一致：基准 %d，本语言 %d"
                     % (ml, len(base_refs), len(cur_refs)))
            else:
                cur_urls = tuple(str(r.get("url", "")).strip()
                                 for r in cur_refs)
                if cur_urls != base_urls:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "references URL 序列与 %s 不一致" % ml)
            if str(cur_fm.get("date", "")).strip() != base_date:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter date 与 %s 不一致：基准 %s，本语言 %s"
                     % (ml, base_date, cur_fm.get("date")))
            if str(cur_fm.get("category", "")).strip() != base_cat:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter category 与 %s 不一致：基准 %s，本语言 %s"
                     % (ml, base_cat, cur_fm.get("category")))


def review(finding, view):
    return finding
