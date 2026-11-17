# -*- coding: utf-8 -*-
"""R05：正文不得出现绝对否定表述

「不可能」「无法」「绝对不能」一类说法把话说死，读者读到的是拒绝而不是
解决路径；改写为建设性说法（「需满足…后方可」）。

否定词形在 `lexicons` 的 `phrase-block`（用途 `negation`，语向键 `*`）：
清单里既有一整条正则，也有纯中文短语——两者都按 `regex` 模式编译，
中文短语用 `word` 模式会因为 CJK 之间没有词边界而全失配。
"""
from plugins._lexicon import hits as _hits
from plugins._lexicon import phrase_block

RULE = "R05"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.10 起执行：FAQ 里写过「这种情况不可能清关」，读者读完只知道被拒，"
                    "不知道条件是什么；改成「需补齐卫生证书后方可申报」后同一篇的"
                    "咨询转化明显不同（销售侧反馈）。判据按语种收绝对否定词形"
                    "（impossible / 不可能 / unmöglich / 불가능），不收「不得」"
                    "「禁止」这类法规用语——那是义务性规范，不是对读者的否定。",
}


def run(view, emit):
    table = phrase_block(view, "negation").get("*", ())
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            for pat, meta in table:
                if _hits(pat, meta["mode"], body):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "正文出现绝对否定表述（改写为建设性说法）")
                    break


def review(finding, view):
    return finding
