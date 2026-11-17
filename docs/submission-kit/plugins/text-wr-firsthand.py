# -*- coding: utf-8 -*-
"""WR03：第一手口径（不写「据说」，具体压倒形容词）

「据说 / 有消息称」一类二手口径在合规稿里无法追溯，必须写具体依据。
"""
from plugins._writing import writing_findings

RULE = "WR03"
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
    RULE: "合规类文章的可信度来自可追溯：写「据说海关会查」既没有出处也没有判断价值，读者无法据此行动。判据按契约 patterns 逐语登记（zh「据说」用 (?<!数) 排除「演示数据说明」的子串假阳，O1 实抓一处），不依赖通用词表推断。",
}


def run(view, emit):
    for rule, sev, loc, detail in writing_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
