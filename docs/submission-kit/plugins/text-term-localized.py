# -*- coding: utf-8 -*-
"""P31：本土概念必须用本语术语，不得照抄英文（拉丁语向补位）

P30 靠字符集只能查非拉丁语向；本条用策略库 lexicons 表（term-localization）覆盖荷/丹/瑞典/
捷克等拉丁语向——它们照抄英文时字符集判据完全看不见。
"""
from plugins._lang import term_localization_hits
from plugins._lexicon import term_localization

RULE = "P31"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.21 实测：nl/da/sv/cs 四语把「保税仓」写成 bonded warehouse（照抄"
                    "英文），而本语有 bonded-opslag / bondedlager / bondedlager 一类"
                    "固定词形；这些语向全用拉丁字母，P30 的字符集判据一点都看不见。"
                    "映射表在策略库 term-localization 词表里，新增一组词只改数据、不改判据。"
                    "档位 warning：行业借词（e-commerce、HS code）在部分语向确属惯例，"
                    "交人工裁定，判据只把「本语已有词形却用了英文」的事实摆出来。",
}


def run(view, emit):
    table = term_localization(view)
    for art in view.articles:
        for lg in sorted(art.parsed):
            for eng, local in term_localization_hits(
                    table, lg, art.body(lg) or ""):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "术语未本地化: 出现英文 %r，本语言应写作 %r" % (eng, local))


def review(finding, view):
    return finding
