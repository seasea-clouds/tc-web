# -*- coding: utf-8 -*-
"""L05：正文与英文相似度过高（疑似未翻译）

四元组 Jaccard 距离大于 SIMILARITY_LIMIT 即报，给出实际读数。
"""

from core.consts import SIMILARITY_LIMIT
from core.textutil import jaccard, ngrams

RULE = "L05"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.34 实测：某语只把英文正文的分节标题换成大写、正文原样保留，"
                    "L01/L02/L03 全绿（题录翻了、文字系统是拉丁、没有中文），"
                    "整篇仍是英文。相似度是抓「换皮不换肉」的唯一结构信号；"
                    "阈值 SIMILARITY_LIMIT 由 F1/D2 两篇已交付稿实测标定。",
}


def run(view, emit):
    for art in view.articles:
        en_ng = art.memo("en_ngrams", lambda: ngrams(art.en[1]))
        for lg in art.langs:
            if lg == "en":
                continue
            score = jaccard(ngrams(art.body(lg)), en_ng)
            if score > SIMILARITY_LIMIT:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "正文与英文相似度过高（%.2f），疑似未翻译" % score)


def review(finding, view):
    return finding
