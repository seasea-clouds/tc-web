# -*- coding: utf-8 -*-
"""P49：母版「清单扩至 N」时，译文不得把清单说成缩减（收紧≠缩减）

母版既写清单扩容，全篇就不能把清单说成缩小/变窄。收紧的是要求，不是清单规模。

短语表在 `lexicons` 的 `phrase-block`（用途 `shrink`），匹配用 `substring`：
中文/西里尔短语之间没有词边界，`word` 模式会全失配。判定逻辑留在本插件——
`core/textutil.py` 只提供测量原语，不提供判据。
"""
from core.textutil import blocks as _blocks
from plugins._lexicon import hits as _hits
from plugins._lexicon import phrase_block

RULE = "P49"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.54 实测（M1 47 语审校）：bg/ca/cs/fa/hr/ko/ro/sr/uk/ur/de/be 十二语"
                    "把 2022 年的「清单收紧」译成清单缩减（de 两处、be 两处、"
                    "ko/uk/bg 各两处，分布在时间轴摘要段与条目段），与母版同一篇"
                    "「清单扩至 1476」自相矛盾：收紧的是要求，不是清单规模。"
                    "只在该篇母版正文出现扩容数字时启用，射程＝母版含该数字的篇，"
                    "避免把「名单缩窄」类正常表述全库误报。",
}

TRIGGER = "1476"


def run(view, emit):
    table = phrase_block(view, "shrink")
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        if TRIGGER not in art.master_body:
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            for bi, blk in enumerate(_blocks(art.body(lg))):
                hits = []
                for p, meta in table.get(lg, ()):
                    hits.extend(f[0] for f in _hits(p, meta["mode"], blk))
                if hits:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块清单扩至 %s，却写成清单缩减 %r（收紧≠缩减）"
                         % (bi + 1, TRIGGER, hits[0]))


def review(finding, view):
    return finding
