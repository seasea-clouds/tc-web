# -*- coding: utf-8 -*-
"""P63：引号跨族配对——X 族开引号开的洞必须用 X 族闭引号关

hu „…» 这类「德式 „ 开 + 书名号族 » 闭」的形状，P60 只管 „ 的闭引号是 ASCII
还是 “/”，管不到 »。逐字符栈状态机以「洞」为单位；不成对不判、撇号不入表、
段落为界跨段不连算、ASCII " 自开自闭（„ 的 ASCII 闭归 P60）。
"""
from plugins._lang import _p63_cross_family

RULE = "P63"
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
    RULE: "v2.06 实测（A7 r2 轮 47 语人工对读）：hu 摘要面出现 „…» ——德式 „ 开、"
                    "书名号族 » 闭，一对引号跨了两个族，排到页面上开闭方向对不上。"
                    "P60 只判 „ 的闭引号是不是 ASCII/“/”，» 这类别族闭引号完全看不见，"
                    "所以另立一条。v1.97 试过「不成对就判」的尺，被否——正文里孤立出现的"
                    "开引号（引语跨段）会整片误报，现口径只判「跨族」这一确定形状。",
}


def run(view, emit):
    for art in view.articles:
        ctx = getattr(art.pkg, "ctx", None)
        anchor = (getattr(ctx, "master_lang", None) if ctx else None) or "zh"
        for lg in sorted(art.parsed):
            if lg == anchor:
                continue
            body = art.body(lg) or ""
            hits = []
            for pi, blk in enumerate([p for p in body.split(chr(10) + chr(10))
                                      if p.strip()]):
                for op, cl in _p63_cross_family(lg, blk):
                    hits.append((pi + 1, op, cl))
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     u"引号跨族配对：%s 开的洞被另一族闭引号 %s 关上 "
                     % (hits[0][1], hits[0][2])
                     + u"；".join(u"块%d（%s…%s）" % r for r in hits[:3])
                     + (u"；等共 %d 处" % len(hits) if len(hits) > 3 else u""))


def review(finding, view):
    return finding
