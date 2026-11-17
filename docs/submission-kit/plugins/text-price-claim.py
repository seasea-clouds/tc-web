# -*- coding: utf-8 -*-
"""R03：正文不得出现价格 / 金额报价

对外文案不写报价。近似表述（约 … 元 / 一千元左右）先剥掉再判，避免把
「约 5000 元」这类模糊说法与硬报价混为一谈。

词表在 `lexicons` 的 phrase-block：`approx-word`（约数词，先剥）、
`price-symbol`（货币符号）、`price-currency`（ISO 码）、`price-qualifier`
（国别限定形，正则行）。数字分组机制（千分位空格形）与报价模板是**语言
机制**，留在本文件；增补词形改库即可。
"""
import re

from plugins._lexicon import phrase_block

RULE = "R03"
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
    RULE: "v1.10 起执行：对外文案一旦写出具体金额（500 元 / 3000 美元 / "
                    "per shipment 800 USD），读者会把它当承诺价，而实际报价随品类、"
                    "口岸、监管条件变化，销售侧无法兜底。所以整类禁写，不设阈值。"
                    "近似表述先剥：约数词表覆盖「约/左右/上下/approx.」一类前缀"
                    "后缀，「约 5000 元」属模糊区间而非报价，历史上按硬报价判红被"
                    "销售团队提为误报。每语只报一次，同段多处同因。",
}

# 报价模板（机制，非词表）：三形态 + 千分位数字分组
_PRICE_NUM = (
    r"(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+(?:[.,]\d+)?"
    r"|\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?"
    r"|\d+(?:[.,]\d+)?)")

_CACHES = {}


def _alt(rows, cache_key, flags=re.I):
    """词形行 → alternation 正则（带模块级缓存；库行序 = 分支序）。

    substring 行按字面转义进分支，regex 行原样——与原常量里的
    `approx\\.?`/`cerca\\s+de` 等写法逐分支等价。**注意**：phrase_block 的
    调用点必须写死用途字面量（_rule_data 靠扫描调用点核对数据源），不要
    把用途包进本函数的参数。
    """
    key = (cache_key, tuple((w, m.get("mode")) for w, m in rows))
    pat = _CACHES.get(key)
    if pat is None:
        pat = re.compile("|".join(
            re.escape(w) if m.get("mode") == "substring" else w
            for w, m in rows), flags)
        _CACHES[key] = pat
    return pat


def _build(view):
    approx = _alt(phrase_block(view, "approx-word").get("*", ()), "approx")
    approx = re.compile(r"(?:%s)\s*%s" % (approx.pattern, _PRICE_NUM), re.I)
    sym = _alt(phrase_block(view, "price-symbol").get("*", ()), "sym")
    cur = _alt(phrase_block(view, "price-currency").get("*", ()), "cur")
    qual = _alt(phrase_block(view, "price-qualifier").get("*", ()), "qual")
    price = [
        r"%s\s?\d" % sym.pattern,
        r"\b%s\s?(?:%s|(?:dollars?|euros?)(?!\s?%s\b))\b"
        % (_PRICE_NUM, cur.pattern, qual.pattern),
        r"\b(?:%s)\s?\d" % cur.pattern,
    ]
    return approx, price


def run(view, emit):
    approx, price = _build(view)
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = approx.sub("", art.body(lg) or "")
            for pat in price:
                if re.search(pat, body, re.I):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "正文出现价格/金额（不写报价）")
                    break


def review(finding, view):
    return finding
