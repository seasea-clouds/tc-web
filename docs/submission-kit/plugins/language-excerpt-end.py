# -*- coding: utf-8 -*-
"""P40：摘要末尾必须有句末标点

剥掉收尾引号/括号后，末字符必须是句末标点（.。！？!?।۔։…؟）。th 整语豁免
（泰文不以句末标点断句）；hy 按 ։ 判（ASCII ":" 不放行）。空摘要归 F02/F07/S09。
"""
from plugins._health import _p40_bad_end

RULE = "P40"
RULES = [RULE]
PHASE = 40
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.39 立规：某语摘要以「…register the importer」收尾（无句号），列表页"
                    "摘要末尾看起来像被截断；v1.40 起 hy 也按 ։ 判——旧版放行 ASCII "
                    "冒号，hy 的「։」被当成合法收尾而实际是句号缺失。th 整语豁免（泰文"
                    "不以句末标点断句，判它等于要求改正字法）。空摘要交给 F02/F07/S09，"
                    "这里不重复出声。",
}


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            if lg == "th":
                continue
            excerpt = str((art.fm(lg) or {}).get("excerpt") or "")
            if not excerpt.strip():
                continue
            bad, last = _p40_bad_end(lg, excerpt)
            if bad:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "摘要末尾缺少句末标点（剥收尾引号/括号后末字符为 %r；"
                     "允许 .。！？!?।۔։…؟；v1.39）" % last)


def review(finding, view):
    return finding
