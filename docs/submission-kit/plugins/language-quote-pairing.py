# -*- coding: utf-8 -*-
"""P60：引号配对与方向：德式 „ 闭引号、«…» 配对、RTL 括号配平

三族引号/括号的配对事故：
  1. „（U+201E 开）的闭引号应为 „ 族规范闭引号；块内 „ 计数 > “ 计数且块内
     存在 ASCII 直引号或 ”（非本位语向）⇒ 闭引号错用。sr 单族篇内一致即合法，
     两族并存才是事故。
  2. «…» 角括号：开/闭计数不等即错；« 之后闭引号写成 ” 或 ASCII " 即错配。
  3. RTL 语向（ar/fa/ur/he）额外校验块内 () [] {} 配平；方向镜像由 bidi 算法
     处理，静态判据只抓括号缺失/错配，不猜渲染方向。
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
                    "闭不判错（波兰语国标就是 „…”）。v2.07 追加 sr 双族并存检：单族"
                    "篇内一致合法，同篇两族并存必有一处破相。"
                    "REG89 阶段 5-a 回流：«…» 角括号在 26 个拉丁语向全量配平实测；"
                    "本轮盲区是「« 开而闭引号写成 ”/ASCII」与「开闭锁计数不等」，"
                    "P60 原只覆盖 „…“ 一族。RTL 语向括号配平另挂本条：ar/fa/ur/he "
                    "正文里 () [] {} 缺一半在 bidi 渲染下尤其难读，静态先抓缺失/错配。",
}

_DQ = chr(0x201E)
_C_HI = chr(0x201C)
_C_LO = chr(0x201D)
_U201D_NATIVE = {"pl", "ro", "hu", "hr", "sr", "da", "no"}

_G_OPEN = "«"
_G_CLOSE = "»"
_RTL_LANGS = {"ar", "fa", "ur", "he"}
_BRACKETS = {"(": ")", "[": "]", "{": "}"}


def _bracket_unbalanced(block):
    """栈配平：返回首个缺配的开/闭括号字符；配平返回 None。"""
    stack = []
    for ch in block:
        if ch in _BRACKETS:
            stack.append(ch)
        elif ch in _BRACKETS.values():
            if not stack or _BRACKETS[stack.pop()] != ch:
                return ch
    return "(" if stack else None


def run(view, emit):
    for art in view.articles:
        ctx = getattr(art.pkg, "ctx", None)
        anchor = (getattr(ctx, "master_lang", None) if ctx else None) or "zh"
        for lg in sorted(art.parsed):
            if lg == anchor:
                continue
            body = art.body(lg) or ""
            blocks = [b for b in body.split(chr(10) + chr(10)) if b.strip()]

            # 1) „…“ 族配对（既有口径）
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

            # 2) «…» 角括号配对与错族闭引号
            n_open = body.count(_G_OPEN)
            n_close = body.count(_G_CLOSE)
            if n_open != n_close:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     u"«…» 角括号配平失败：« ×%d、» ×%d（开闭锁计数不等）"
                     % (n_open, n_close))
            wrong_close = []
            for pi, blk in enumerate(blocks):
                if _G_OPEN in blk and (chr(0x201D) in blk or chr(0x22) in blk):
                    wrong_close.append(pi + 1)
            if wrong_close:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     u"« 开引号的闭引号应为 »(U+00BB)，块%s 误用 ”/ASCII 直引号"
                     % "、".join("块%d" % b for b in wrong_close[:3]))

            # 3) RTL 语向括号配平
            if lg in _RTL_LANGS:
                bad = []
                for pi, blk in enumerate(blocks):
                    miss = _bracket_unbalanced(blk)
                    if miss:
                        bad.append((pi + 1, miss))
                if bad:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         u"RTL 正文括号未配平："
                         + u"；".join(u"块%d 缺配 %s" % (b, m) for b, m in bad[:3]))


def review(finding, view):
    return finding
