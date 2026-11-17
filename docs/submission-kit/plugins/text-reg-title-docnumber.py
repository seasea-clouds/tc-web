# -*- coding: utf-8 -*-
"""R15：法规标题不得重复写文号

页面第一列已单独展示 doc_number；标题里再写一次，列表页会「(海关总署公告
2025 年第 12 号) 海关总署公告 2025 年第 12 号」重复两遍。
"""
RULE = "R15"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.59 实测：法规标题写成「海关总署公告 2025 年第 12 号 关于…的公告」，"
                    "而 doc_number 字段已经是同一个文号，列表页左侧文号列与标题列重复"
                    "展示两遍，移动端一行折成三行。判据只比 doc_number 与 title 的包含"
                    "关系（casefold），不做模糊匹配——标题里出现文号数字片段（例如日期"
                    "2025）不算重复，避免误伤。法规线独占：博客没有 doc_number 字段。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            fm = art.fm(lg) or {}
            docn = str(fm.get("doc_number") or "").strip()
            title = str(fm.get("title") or "")
            if docn and docn.casefold() in title.casefold():
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "title 里不要重复写文号（%r 已在 doc_number 字段）；"
                     "列表页会重复展示" % docn)


def review(finding, view):
    return finding
