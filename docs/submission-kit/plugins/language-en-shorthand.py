# -*- coding: utf-8 -*-
"""P72：非英语语向不得沿用英文紧凑形残词（wks / 15-day / dual-reg）

单数缩写 wk/hr/yr 不收（跨语同形碰撞，如 no 的 yr），只收复数形与数字复合形。
扫描前剥离链接目标与 references URL。
"""
import re

RULE = "P72"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v2.20 立规（REG24 阶段 4 逐语人工审计）：出稿规格里建议的英文紧凑摘要形"
                    "被 20 个非英语语向原样沿用（wks / 15-day / dual-reg.），机检全绿"
                    "漏放——P52 词表只收散文语法词形、不含缩写族，F07 只管长度。"
                    "扫描前剥链接目标与 references URL（全库 2843 份实证剥除后 0 误报，"
                    "合法命中只有 /hr/packages/ 与 first-90-days 两族）。射程 title + "
                    "excerpt + 正文三层。",
}

_RES = (
    r"\b(?:wks|hrs|yrs)\b",
    r"\bdual[ -]reg\b|\bdouble-reg\b",
    r"\b\d{1,3}-(?:day|wk|hr|yr|month|months)s?\b",
)
_MD_LINK_TARGET_RE = re.compile(r"\]\([^)]*\)")


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            if lg == "en":
                continue
            fm = art.fm(lg) or {}
            ref_urls = " ".join(
                str(r.get("url", "")) for r in (fm.get("references") or [])
                if isinstance(r, dict))
            zones = [("title", str(fm.get("title") or "")),
                     ("excerpt", str(fm.get("excerpt") or ""))]
            body_txt = _MD_LINK_TARGET_RE.sub(" ", art.body(lg) or "")
            if ref_urls:
                body_txt = body_txt.replace(ref_urls, " ")
            zones.append(("body", body_txt))
            for zone, txt in zones:
                for res in _RES:
                    m = re.search(res, txt, re.I)
                    if m:
                        emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                             "%s 层出现英文紧凑形残词 %r（非英语语向须用本语"
                             "词形；REG24 阶段 4 实测 20 语摘要 wks/15-day/"
                             "dual-reg 离群）" % (zone, m.group(0)))


def review(finding, view):
    return finding
