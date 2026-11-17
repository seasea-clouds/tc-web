# -*- coding: utf-8 -*-
"""P38：孟加拉文不得出现「裸辅音 + CANDRABINDU」码位形状

ঁ(U+0981) 只能跟在元音/元音符号之后；紧贴裸辅音是**不成立**的形状，几乎总是
把元音符号（如 U+09C1）批量替换打错码位。该形状也可能是合法词（辅音带固有
元音，如 বঁধু），因此档位 warning 交孟加拉语审校复核，不自动替换。
"""
from plugins._health import _bn_chandrabindu_hits, _fmt_p38

RULE = "P38"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["bn"], "zones": ['body']}

RATIONALE = {
    RULE: "v1.37 实测：某语孟加拉文把「শর্ত」（条件）里的 U+09C1 批量替换成 "
                    "U+0981，得到 শঁর্ত 一类不成立的码位形状，读者看不出错在哪、只"
                    "觉得「字长得怪」。只管 Bengali 区段：同一形状在 Devanagari 里合法"
                    "（ne 后置词 सँग、hi महँगा），实测扩到 hi/ne 会误伤 29 处，因此"
                    "射程锁在 bn。扫 body 而不是剥链接后的 bare——alt 也是对外文案。",
}


def run(view, emit):
    for art in view.articles:
        for lg in ("bn",):
            if lg not in art.parsed:
                continue
            hits = _bn_chandrabindu_hits(art.body(lg) or "")
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "孟加拉文 CANDRABINDU(U+0981) 紧跟裸辅音字母，疑似批量替换打错"
                     "码位；该形状也可能是合法词（辅音带固有元音，如 বঁধু），请孟加拉语"
                     "审校复核，不要一律换成 anusvara: " + _fmt_p38(hits))


def review(finding, view):
    return finding
