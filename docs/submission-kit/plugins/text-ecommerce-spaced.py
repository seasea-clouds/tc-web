# -*- coding: utf-8 -*-
"""P39：电商复合词的 e- 前缀不得被空格拆开

正字法：e-commerce / e-handel / e-ticaret 连写。写成「e commerce」是批量翻译
把连字符当分隔符吃掉的结果。正则与射程语向都在 `lexicons` 的 phrase-block
（用途 ecommerce-spaced / ecommerce-spaced-langs），增补改库即可。
"""
import re

from plugins._health import _p39_hits
from plugins._lexicon import phrase_block
from plugins._shared import fmt_hits

RULE = "P39"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["af", "cs", "da", "de", "en", "id", "nl", "no",
                      "pl", "sk", "sv", "tr"], "zones": ['body']}

RATIONALE = {
    RULE: "v1.39 立规、v1.40 升 error：某语把 e-commerce 写成「e commerce」，"
                    "站方编辑回执「英文读者一眼看出是机翻」。升档前 P0/F1 的历史写法"
                    "已在同批改净，存量读 0，不再留 warning 档。射程锁定 "
                    "E_COMMERCE_SPACED_LANGS（把 e- 复合词当正字法的语向），"
                    "其他语言里「e」是独立字母或连词，不判。",
}


def run(view, emit):
    _langs = sorted(v for v, _m in
                    phrase_block(view, "ecommerce-spaced-langs").get("*", ()))
    pats = phrase_block(view, "ecommerce-spaced").get("*", ())
    if not pats:
        return                      # 库缺正则行：判据静默（数据缺失非代码缺失）
    pat = re.compile(pats[0][0], re.IGNORECASE | re.UNICODE)
    for art in view.articles:
        for lg in _langs:
            if lg not in art.parsed:
                continue
            hits = _p39_hits(art.body(lg) or "", pat)
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "正文电商复合词的 e- 前缀被空格拆开（正字法：e-commerce / "
                     "e-handel / e-ticaret；v1.40）: "
                     + fmt_hits([(ln, "%r" % w) for ln, w in hits]))


def review(finding, view):
    return finding
