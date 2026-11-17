# -*- coding: utf-8 -*-
"""ST04：正文不得出现中文 AI 高频词（赋能 / 抓手 / 闭环…）

中文母版的 AI 腔词表：赋能、抓手、闭环、底层逻辑、值得注意的是、综上所述。
"""
from plugins._style import style_findings

RULE = "ST04"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "中文母版是对外文案的唯一语义源，一旦母版里出现「赋能」「抓手」「闭环」「底层逻辑」这类词，47 语译文会把这个腔调放大——译者只能照着译，译出来的每一语都带同样的味道。因此在母版层就锁死，比在译语层逐语纠正便宜得多。词表按 real 缺陷逐条登记（不做「所有四字词」这类推断）。",
}


def run(view, emit):
    for rule, sev, loc, detail in style_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
