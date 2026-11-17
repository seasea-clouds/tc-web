# -*- coding: utf-8 -*-
"""W01：英文正文偏短（建议 ≥400 词）

en 是站方列表页与搜索摘要的语言基准，正文过短说明该篇内容量不足。
"""
import re

from core.consts import MIN_EN_WORDS

RULE = "W01"
RULES = [RULE]
PHASE = 60
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["en"], "zones": ['body']}

RATIONALE = {
    RULE: "v1.10 立规：某篇英文正文只有 180 词，形同摘要，读者点进详情页得不到"
                    "新信息，跳出率高。阈值 400 词按站方内容规范取整（约两屏正文）。"
                    "档位 warning：短不等于错，不允许由判据替作者决定篇幅，只提示。"
                    "只判 en——其他语向的篇幅由 W02（超长段）与 P21–P23（结构对齐）"
                    "从母版反推，不必另设绝对阈值。",
}


def run(view, emit):
    for art in view.articles:
        if "en" not in art.parsed:
            continue
        words = len(re.findall(r"\w+", art.body("en") or "", re.UNICODE))
        if words < MIN_EN_WORDS:
            emit(RULE, SEVERITY, "en/%s" % art.slug,
                 "英文正文偏短（%d 词，建议 ≥%d）" % (words, MIN_EN_WORDS))


def review(finding, view):
    return finding
