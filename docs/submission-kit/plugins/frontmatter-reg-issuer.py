# -*- coding: utf-8 -*-
"""R18：法规 issuer 必须是固定集合（题录 + 逐语 frontmatter）

发布机构决定责任主体与适用口径；写成自由文本会让「谁发的」这一栏无法聚合。
"""
from plugins import _lexicon

RULE = "R18"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["meta", "parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['metadata', 'frontmatter']}

RATIONALE = {
    RULE: "v1.57 建立法规线时实测：issuer 里出现「海关总署、农业农村部」"
                    "（两个机构并列）、「GACC」缩写、「中华人民共和国海关总署」"
                    "全称三种写法，站方按固定机关集合聚合「发布机构」页，"
                    "三种写法聚成三个机构。规范是「GACC / MARA / NMPA / State Council」"
                    "一类站内固定名，题录与逐语 frontmatter 同值，两臂分开报。",
}


def run(view, emit):
    _lexicon.set_values(view, "issuer")
    issuers = _lexicon.values("issuer")
    for art in view.articles:
        if not art.is_reg:
            continue
        if art.meta_state in ("ok", "empty"):
            iss = str(art.meta.get("issuer") or "").strip()
            if iss and iss not in issuers:
                emit(RULE, SEVERITY, art.slug,
                     "issuer 必须是 %s 之一（当前 %r）"
                     % (" / ".join(issuers), iss))
        for lg in sorted(art.parsed):
            fv = str((art.fm(lg) or {}).get("issuer") or "").strip()
            if fv and fv not in issuers:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "issuer 必须是 %s 之一（当前 %r）"
                     % (" / ".join(issuers), fv))


def review(finding, view):
    return finding
