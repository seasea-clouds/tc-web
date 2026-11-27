# -*- coding: utf-8 -*-
"""P65：官方文本里的拉丁学名必须逐字保留

母版（含 <!-- original --> 的法规稿）任一块出现「属名 种加词」，各语同一块
必须含同一串——学名不得音译、不得改写大小写、不得漏掉命名人缩写。
"""
from core.consts import (
    SCI_AUTHOR_L_RE, SCI_BINOMIAL_RE, SCI_STOPWORDS,
)

RULE = "P65"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.18 实测（REG16 47 语重译）：旧稿约 40 语把学名音译或换成近似水果名"
                    "（李/杏→橄榄/樱桃/桃/杏仁/猕猴桃），判据全绿但语义全错。学名是"
                    "官方文本的法定标识，必须逐字保留：按母版「属名大写＋种加词小写」"
                    "提取，排除 This consignment／Cold treatment 一类形似词组；"
                    "v2.20 把「属名 种加词 L.」的命名人缩写并入射程（REG19 实测"
                    "ar/he/fa/ur 漏 L.），存量 REG8 8 语同型漏检按不追溯豁免。",
}


def run(view, emit):
    for art in view.articles:
        ml = art.master_lang
        m_body = art.master_body
        if "<!-- original -->" not in m_body:
            continue
        by_block = []
        for blk in art.blocks(ml):
            names = set()
            for a, b in SCI_BINOMIAL_RE.findall(blk):
                if a in SCI_STOPWORDS or b in SCI_STOPWORDS:
                    continue
                names.update(["%s %s" % (a, b)])
            for a, b, _abbr in SCI_AUTHOR_L_RE.findall(blk):
                if a in SCI_STOPWORDS or b in SCI_STOPWORDS:
                    continue
                names.update(["%s %s L." % (a, b)])
            by_block.append(sorted(names))
        if not any(by_block):
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = art.blocks(lg)
            for bi, names in enumerate(by_block):
                if not names:
                    continue
                text = cur[bi] if bi < len(cur) else ""
                miss = [n for n in names if n not in text]
                if miss:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块缺少拉丁学名 %s（学名必须逐字保留，不得音译或改写）"
                         % (bi + 1, "、".join(miss[:3])))


def review(finding, view):
    return finding
