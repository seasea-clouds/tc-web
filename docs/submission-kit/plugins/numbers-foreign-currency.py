# -*- coding: utf-8 -*-
"""P32：金额只用「元」与「美元」，不得出现外币词

外币词（euro/yen/рубл/원…）须紧邻数字才算命中，避开同形词误报。
"""
import re

from core.consts import _DIGIT_NEAR_RE, _MONEY_PRE, _MONEY_POST
from plugins._lexicon import forbidden_currency
RULE = "P32"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "稿件面向中国跨境业务，金额统一用「元」「美元」；混入欧元/日元/卢布会让读者以为报价币种不同。邻近判定是必需的：白俄「перавады вон」是「汇出」、韩语「원료」是「原料」，都含货币同形词却没有金额含义。",
}

def _digit_adjacent(body, start, end, span=3):
    """True when a digit sits right next to the [start:end) slice.

    A wide window is what produced false positives: Korean
    "\uad6d\ubb34\uc6d0\ub839 443\ud638" (State Council decree No. 443) puts a number
    near the won-shaped \uc6d0 that is really "won/\uc6d0" as in "source/council".
    Requiring the digit to touch the word keeps those out while still catching
    5000\u5186, 360 yuan and 5000 \uc6d0.
    """
    return bool(_DIGIT_NEAR_RE.search(body[max(0, start - span):start]) or
                _DIGIT_NEAR_RE.search(body[end:end + span]))


def foreign_currency_hits(table, body):
    """Other countries' currencies used for money amounts.

    Returns [(label, matched_word), ...]. A match only counts when the word
    sits near a digit, which keeps homographs out — Belarusian
    "перавады вон" (outward transfers) must not read as Korean won.
    """
    out = []
    for label, words in table.items():
        for w in words:
            for m in re.finditer(_MONEY_PRE + re.escape(w) + _MONEY_POST, body, re.I):
                # REG18 逐语机检实测（2026-11-09）：韩语「(1)원료 및 완제품」
                # 的 원료（原料）被判成 KRW 单位——序号 (1) 的数字落在 ±3
                # 邻近窗口内。货币单位「원」后面不接谚文音节；원료 / 원인 /
                # 원문 / 오염원 这类同形词直接跳过，真金额「5000원」照旧命中。
                if (w == "원" and m.end() < len(body)
                        and "\uac00" <= body[m.end()] <= "\ud7a3"):
                    continue
                if _digit_adjacent(body, m.start(), m.end()):
                    out.append((label, m.group(0)))
                    break
    return out

def run(view, emit):
    table = forbidden_currency(view)
    for art in view.articles:
        for lg in art.langs:
            for label, word in foreign_currency_hits(table, art.body(lg)):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "金额使用了非指定货币 %s（%r）；只允许「元」与「美元」"
                     % (label, word))

def review(finding, view):
    return finding
