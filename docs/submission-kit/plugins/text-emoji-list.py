# -*- coding: utf-8 -*-
"""B11：一行不得出现多个 emoji（会被当成列表）

行内两个以上 emoji 在部分客户端被解析成项目符号列表，语义错乱。
"""
import re

RULE = "B11"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "站方 markdown 渲染器把行首 emoji 序列当无序列表标记，一行三个 emoji 会渲染成三条空列表项，后面那行正文被吞掉；emoji 只能用于强调单个要点，不能当项目符号用。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(body.split("\n"), 1):
                if len(re.findall(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", ln)) >= 2:
                    emit(RULE, SEVERITY, tag, "第 %d 行 emoji 列表混排" % i)
                    break

def review(finding, view):
    return finding
