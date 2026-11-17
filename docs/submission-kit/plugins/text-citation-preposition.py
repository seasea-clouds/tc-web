# -*- coding: utf-8 -*-
"""P54：丹/挪文号引用的年份介词不得写成 fra

丹麦语/挪威语文号里「第 486 号 2018 年」应写 år/av，fra 留给颁发机关
（… fra Miljøstyrelsen）。写成「nr. 486 fra 2018 fra seks ministerier」时
两个 fra 语义打架。
"""
import re

from core.consts import P54_DOUBLE_RE
from plugins._lexicon import phrase_block

RULE = "P54"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["da", "no"], "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v1.57 实测（REG9 da/no）：文号引用写成「Bekendtgørelse nr. 486 fra 2018 "
                    "fra seks ministerier」，两个 fra 一个指年份、一个指颁发机关，读者"
                    "分不清哪个是出处。旧形正是在题录（references 标题）里成片的，因此"
                    "射程含正文、摘要、标题与 references 标题。档位 error：文号引用是"
                    "可核对的官方标识，写错介词等于指向错误的年份。",
}


_CACHES = {}


def _build(view):
    """文号词形（p54-doc-word，regex 行）与年份介词（p54-prep|语向）从库取；
    「文号 (nr.) 编号 fra 年份」的模板结构与 P54_DOUBLE_RE 是机制，留在本文件。
    """
    docs = phrase_block(view, "p54-doc-word").get("*", ())
    preps = {k: pairs[0][0]
             for k, pairs in phrase_block(view, "p54-prep").items()}
    key = (tuple((w, m.get("mode")) for w, m in docs),
           tuple(sorted(preps.items())))
    cit = _CACHES.get(key)
    if cit is None:
        doc_alt = "|".join(w for w, _m in docs)
        cit = (preps, {
            lg: re.compile(r"(?:%s)(?:\s+nr\.?)?\s*\d{1,4}\s+fra\s+20\d\d"
                           % doc_alt, re.I) for lg in preps})
        _CACHES[key] = cit
    return cit


def run(view, emit):
    preps, cit_res = _build(view)
    for art in view.articles:
        for lg in ("da", "no"):
            if lg not in art.parsed or lg not in preps:
                continue
            fm = art.fm(lg) or {}
            whole = "\n".join([art.body(lg) or "",
                               str(fm.get("excerpt", "")),
                               str(fm.get("title", ""))])
            scan = whole + "\n" + "\n".join(
                str(r.get("title", ""))
                for r in (fm.get("references") or [])
                if isinstance(r, dict))
            bad = [m.group(0) for m in cit_res[lg].finditer(scan)]
            dbl = [m.group(0) for m in P54_DOUBLE_RE.finditer(scan)]
            if bad or dbl:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "文号年份介词写成 fra（%s 应写 %s，fra 留给颁发机关）"
                     "%d 处：%s%s"
                     % (lg, preps[lg], len(bad),
                        "；".join(x[:52] for x in bad[:2]),
                        "；另 fra…fra 双写 %d 处" % len(dbl) if dbl else ""))


def review(finding, view):
    return finding
