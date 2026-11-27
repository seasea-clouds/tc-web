# -*- coding: utf-8 -*-
"""P85：摘要把正文的「过熟」限定语弱化成「成熟」时必须红

REG109 zh 摘要写「过熟黄香蕉一律不许出口」，45 语译文摘要写成「成熟/ripe
黄香蕉」——正文（B11 之外的施行段）仍是「过熟」，摘要与正文口径不一致，
读者会以为熟香蕉可出口。P77 只看压缩比、P59 只看数字阈值，均不覆盖
「程度限定语被弱化」。判据只在母版摘要出现「过熟」时点火，按语向闭类
表要求摘要块含本语「过熟」正形；表随插件维护，新增语向只加一行。
"""
from plugins import _lexicon

RULE = "P85"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v2.25 立规（REG109 45 语实证）：摘要是读者第一屏，`ripe` 与"
                    "`overripe` 在英语里只差前缀，在 hu/ka/ta 里是完全不同的词形；"
                    "把「过熟不许出口」写成「成熟不许出口」会改变合规结论。判据"
                    "以母版摘要的「过熟」为开关，逐语要求本语对应正形，不做翻译"
                    "质量判断。",
}



def run(view, emit):
    _lexicon.set_judge(view, RULE)
    for art in view.articles:
        ml = art.master_lang
        base = art.blocks(ml)
        if not base or "过熟" not in base[0]:
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            forms = _lexicon.judge(RULE, "overripe").get(lg)
            if not forms:
                continue
            cur = art.blocks(lg)
            text = cur[0] if cur else ""
            if not any(f in text for f in forms):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "摘要块未保留「过熟」限定语（本语正形：%s）；"
                     "与母版「过熟黄香蕉一律不许出口」口径不一致"
                     % " / ".join(forms))


def review(finding, view):
    return finding
