# -*- coding: utf-8 -*-
"""R04：正文不得承诺交付周期

「3 个工作日」「48 小时内出方案」一类时限承诺一旦写进文案，就成了对读者的
交付义务，而实际排期取决于资料完整度与口岸排仓。

时效语境词（delivery / lead time / turnaround / shipping time）与单位
（days / weeks）在 `lexicons` 的 phrase-block（用途 delivery-noun /
delivery-unit）；「数量＋单位」的模板结构是**语言机制**，留在本文件。
"""
import re

from plugins._lexicon import phrase_block

RULE = "R04"
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
    RULE: "v1.10 起执行：早期文案写过「3 个工作日出具预审意见」，被销售当作"
                    "对外承诺引用，实际排期受资料完整度与口岸排仓影响，无法兑现。"
                    "判据只收「数量＋工作日/小时/天」的时限形，不收流程描述"
                    "（「申报后进入查验环节」不含时限，不算承诺）。条款枚举式"
                    "（「第 3 条」「2 小时内温度回升」出现在官方译文段）不在此列，"
                    "只匹配「交付/出结果」语境的时限。",
}

_CACHES = {}


def _build(view):
    """从库取语境词与单位，重建单条模板（库行序 = 分支序，模块级缓存）。"""
    nouns = phrase_block(view, "delivery-noun").get("*", ())
    units = phrase_block(view, "delivery-unit").get("*", ())
    key = (tuple((w, m.get("mode")) for w, m in nouns),
           tuple((w, m.get("mode")) for w, m in units))
    pat = _CACHES.get(key)
    if pat is None:
        pat = re.compile(
            r"(?is)\b(?:%s)\b[^.]{0,60}?\b\d+\s*[-–to]*\s*\d*\s*(?:%s)\b"
            % ("|".join(w for w, _m in nouns),
               "|".join(w for w, _m in units)))
        _CACHES[key] = pat
    return pat


def run(view, emit):
    pat = _build(view)
    for art in view.articles:
        for lg in sorted(art.parsed):
            if pat.search(art.body(lg) or ""):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "正文出现交付周期承诺")
                break


def review(finding, view):
    return finding
