# -*- coding: utf-8 -*-
"""L09：日文出现中文简体字（应为日文新字体）

按 JA_SIMPLIFIED_ONLY 字形表扫日文全文，命中去重后列出。
"""

from core.consts import JA_SIMPLIFIED_ONLY

RULE = "L09"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'body']}

RATIONALE = {
    RULE: "v1.90 实测（REG7 日文稿）：中文母版直接机翻成日文时，常用汉字保持"
                    "简体字形（说/对/铁/关），日文读者一眼看出是中文。字形表只收"
                    "「简繁日形不同」的字，同形字（国/学/会）不收——否则会误报整篇。",
}


def run(view, emit):
    for art in view.articles:
        if "ja" not in art.parsed:
            continue
        fm = art.fm("ja")
        blob = " ".join([str(fm.get("title") or ""),
                         str(fm.get("excerpt") or ""), art.body("ja")])
        hits = []
        for ch in blob:
            if ch in JA_SIMPLIFIED_ONLY and ch not in hits:
                hits.append(ch)
        if hits:
            emit(RULE, SEVERITY, "ja/%s" % art.slug,
                 "日文出现中文简体字（应为日文新字体）：%s" % " ".join(hits))


def review(finding, view):
    return finding
