# -*- coding: utf-8 -*-
"""L02：excerpt 与英文完全相同（疑似未翻译）

逐语比对 excerpt 与 en excerpt 是否逐字相同。
"""


RULE = "L02"
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
    RULE: "v1.34 实测：摘要层比标题更容易被漏译——写手常先把英文摘要粘进"
                    "各语 mdx 占位，后续只改正文不改摘要，S09/S11 只校长度与形状，"
                    "发现不了「整段就是英文」。逐字相等判据能稳定抓到这种占位残留。",
}


def run(view, emit):
    for art in view.articles:
        en_e = art.en_excerpt.strip()
        if not en_e:
            continue
        for lg in art.langs:
            if lg == "en":
                continue
            if str(art.fm(lg).get("excerpt") or "").strip() == en_e:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "excerpt 与英文完全相同（疑似未翻译）")


def review(finding, view):
    return finding
