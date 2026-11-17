# -*- coding: utf-8 -*-
"""L01：title 与英文完全相同（疑似未翻译）

逐语比对 title 与 en title 的字符串是否逐字相同。
只判「完全相同」，
"""


RULE = "L01"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.34 实测（F1 起手阶段）：某语 title 直接照抄英文，站方列表页显示"
                    "英文标题而非本语标题，官方 checker 不报。逐字相等是最保守的写法——"
                    "只抓「完全没动」，不判「译得对不对」（那属人工审校）。",
}


def run(view, emit):
    for art in view.articles:
        en_t = art.en_title.strip()
        if not en_t:
            continue
        for lg in art.langs:
            if lg == "en":
                continue
            if str(art.fm(lg).get("title") or "").strip() == en_t:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "title 与英文完全相同（疑似未翻译）")


def review(finding, view):
    return finding
