# -*- coding: utf-8 -*-
"""P60：德式引号 „ 的闭引号必须配本族规范闭引号

„（U+201E 开）的闭引号应为 „ 族规范闭引号。块内 „ 计数 > “ 计数且块内存在
ASCII 直引号或 ”（非本位语向）⇒ 闭引号错用。sr 单族篇内一致即合法，两族
并存才是事故。
"""
RULE = "P60"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.02 实测（REG10 47 语审计）：de 7 对、sk 3 对引号的闭引号写成 ASCII "
                    "直引号，页面上 „…\" 一开一闭不同族，排版软件按不同族处理会导致"
                    "后续引号方向全反。v2.03 语种感知：„ 闭引号本位分两族——德式"
                    " „…“(U+201C) 与波罗的-罗-匈-克-塞式 „…”(U+201D)，对后者 U+201D "
                    "闭不判错（波兰语国标就是 „…”）。v2.07 追加 sr 双族并存检：单族篇内"
                    "一致合法，同篇两族并存必有一处破相。",
}

_DQ = chr(0x201E)
_C_HI = chr(0x201C)
_C_LO = chr(0x201D)
_U201D_NATIVE = {"pl", "ro", "hu", "hr", "sr", "da", "no"}


def run(view, emit):
    for art in view.articles:
        ctx = getattr(art.pkg, "ctx", None)
        anchor = (getattr(ctx, "master_lang", None) if ctx else None) or "zh"
        for lg in sorted(art.parsed):
            if lg == anchor:
                continue
            body = art.body(lg) or ""
            blocks = [b for b in body.split(chr(10) + chr(10)) if b.strip()]
            hits = []
            for pi, blk in enumerate(blocks):
                n_open = blk.count(_DQ)
                if n_open == 0:
                    continue
                n_hi = blk.count(_C_HI)
                n_ascii = blk.count(chr(0x22))
                n_lo = blk.count(_C_LO)
                if n_open > n_hi and (n_ascii > 0
                                      or (n_lo > 0 and lg not in _U201D_NATIVE)):
                    hits.append((pi + 1, n_open, n_hi, n_ascii + n_lo))
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     u"引号配对：„ 开引号的闭引号应为 “(U+201C)，而非 ASCII 直引号"
                     u"或 ”(U+201D) "
                     + u"；".join(u"块%d（„×%d、“×%d、\"×%d）" % r for r in hits[:3])
                     + (u"；等共 %d 块" % len(hits) if len(hits) > 3 else u""))
            if lg == "sr":
                fam = set()
                for blk in blocks:
                    if blk.count(_DQ):
                        if blk.count(_C_HI):
                            fam.add(_C_HI)
                        if blk.count(_C_LO):
                            fam.add(_C_LO)
                if len(fam) > 1:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         u"sr 引号族混用：同篇并见 „…“(U+201C) 与 „…”(U+201D)，"
                         u"应篇内统一一族")


def review(finding, view):
    return finding
