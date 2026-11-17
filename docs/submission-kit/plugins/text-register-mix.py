# -*- coding: utf-8 -*-
"""P45：同一篇内称呼语域不得混用（非尊形 × 尊形并存）

只认 REGISTER_MARKERS 词表内的代词/物主限定词层标记；动词形态不在射程。
报 warning 交人工终审——北欧语 CTA 末块 du→复数是既定约定，不能一律锁红。
"""
from core.consts import REGISTER_MARKERS

RULE = "P45"
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
    RULE: "v1.43 实测（F1 48 语审校）：同一篇正文前半用 du（非尊）、后半用 Sie"
                    "（尊），读者会觉得是两个人写的；合同类文案尤其忌讳。词表只收"
                    "hu/ro/ca/fr/es/de/it/el/pt 九语单侧无歧义的代词与物主限定词，"
                    "动词形态不收（同一动词的尊/非尊变形要靠句法判断，误报率高），"
                    "北欧语不收（CTA 末块 du→复数已是站方既定约定）。档位 warning："
                    "语域选择有时是刻意的，交人工终审。",
}


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            pair = REGISTER_MARKERS.get(lg)
            if not pair:
                continue
            body = art.body(lg) or ""
            lo = pair[0].findall(body)
            hi = pair[1].findall(body)
            if lo and hi:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "称呼语域混用（非尊 %r × 尊 %r）；全文应统一尊形"
                     % (sorted(set(lo))[:4], sorted(set(hi))[:4]))


def review(finding, view):
    return finding
