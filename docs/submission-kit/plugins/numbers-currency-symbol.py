# -*- coding: utf-8 -*-
"""P33：金额不得用货币符号或 ISO 代码

`$`/`¥`/`€` 与 USD/CNY 一律改成本土文字写法（5000 元 / 50 美元）。
"""
import re

from core.consts import _MONEY_NUM, _MONEY_POST, _MONEY_PRE
from plugins import _lexicon
RULE = "P33"
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
    RULE: "符号写法在不同语向下会被字体渲染成不同宽度的字形，且站方检索按文字匹配；符号还要靠数字邻接判定，否则波兰语 zło（提交）会被当成兹罗提符号。ISO 代码对普通读者不可读，属于对内部写法。",
}

def currency_symbol_hits(body):
    """Money written with a currency sign or an ISO code instead of words.

    Returns [(kind, matched_text), ...] where kind is one of
    '外币符号' / '符号写法' / 'ISO代码'.

    Image paths, URLs and inline code are stripped first. A sign only counts
    when it sits next to a number: this is what keeps Polish "z\u0142o\u017cy"
    (to file a request) from reading as the zloty sign, and a stray '$' in
    prose out of the report entirely.
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"`[^`]*`", "", t)

    seps = r"[\s\u00a0]?"
    out = []

    def scan(sign, kind):
        esc = re.escape(sign)
        if re.search(r"[\w]", sign, re.U):
            # 字母型符号（z\u0142 / kr / CHF / Fr.）需要词边界，否则会命中单词内部
            pre = _MONEY_PRE + esc + seps + _MONEY_NUM
            suf = _MONEY_NUM + seps + esc + _MONEY_POST
        else:
            pre = esc + seps + _MONEY_NUM
            suf = _MONEY_NUM + seps + esc
        for pat in (pre, suf):
            for m in re.finditer(pat, t):
                out.append((kind, m.group(0).strip()))

    for sign in _lexicon.values("currency-symbol", "foreign"):
        scan(sign, "\u5916\u5e01\u7b26\u53f7")           # 外币符号
    for sign in _lexicon.values("currency-symbol", "allowed"):
        scan(sign, "\u7b26\u53f7\u5199\u6cd5")           # 符号写法
    for code in _lexicon.values("currency-symbol", "iso"):
        pats = (_MONEY_PRE + code + seps + _MONEY_NUM,
                _MONEY_NUM + seps + code + _MONEY_POST)
        for pat in pats:
            for m in re.finditer(pat, t):
                out.append(("ISO\u4ee3\u7801", m.group(0).strip()))

    # 去重（同一处可能被前缀型与后缀型同时命中）
    seen = set()
    uniq = []
    for k, v in out:
        if v not in seen:
            seen.add(v)
            uniq.append((k, v))
    return uniq

def run(view, emit):
    _lexicon.set_values(view, "currency-symbol")
    for art in view.articles:
        for lg in art.langs:
            for kind, hit in currency_symbol_hits(art.body(lg)):
                if kind == "\u7b26\u53f7\u5199\u6cd5":
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "\u91d1\u989d\u7528\u4e86\u7b26\u53f7\u5199\u6cd5 %r"
                         "\uff1b\u91d1\u989d\u5e94\u5199\u4f5c\u672c\u571f"
                         "\u6587\u5b57\uff08\u300c\u5143\u300d\u300c\u7f8e"
                         "\u5143\u300d\uff0c\u4f8b\uff1a5000 \u5143 / 50 "
                         "\u7f8e\u5143\uff09" % hit)
                else:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "\u91d1\u989d\u4f7f\u7528\u4e86%s %r\uff1b\u53ea"
                         "\u5141\u8bb8\u300c\u5143\u300d\u4e0e\u300c\u7f8e"
                         "\u5143\u300d\u4e24\u79cd\u8d27\u5e01\uff0c\u4e14"
                         "\u9700\u7528\u6587\u5b57\u5199\u6cd5" % (kind, hit))

def review(finding, view):
    return finding
