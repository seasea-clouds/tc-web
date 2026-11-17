# -*- coding: utf-8 -*-
"""P35：某一块与基准（或英文）同序号块逐字相同＝未本地化

P22/P23 只比块类型与规模、P25–P27 只比标记、L05 只算全篇相似度，
「一篇里只有一段没译」此前无规则覆盖。只比同序号块（P23 已保证逐块同构），
不会因段落错位误报；短块与图片/表格/代码块不判。
"""
import re

from core.consts import COPY_BLOCK_MIN, COPY_BLOCK_WORDS
from core.textutil import _block_kind, _norm_copy
from plugins._lang import _p35_quote_exempt

RULE = "P35"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.30 实测：某语整篇只把首段翻成了本语，其余段落沿用英文原文；"
                    "L05 全篇相似度 0.31 远低于阈值，P21–P27 全绿——「一篇里只有一段"
                    "没译」这类缺口此前无判据覆盖。两个方向都判：与中文母版逐字相同"
                    "（非 CJK 语向照抄母版）、与英文逐字相同（该译没译）。A20 追加"
                    "引文豁免：站方要求逐字保留的英文法定声明（This consignment…）在"
                    "引用块里原样保留是正确写法，两臂对称放行。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = [_norm_copy(x) for x in art.blocks(ml)]
        en = ([_norm_copy(x) for x in art.blocks("en")]
              if "en" in art.parsed else None)
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            for bi, blk in enumerate(art.blocks(lg)):
                if _block_kind(blk) in ("IMG", "TABLE", "CODE"):
                    continue
                nb = _norm_copy(blk)
                if len(nb) < COPY_BLOCK_MIN:
                    continue
                if (bi < len(base) and nb == base[bi]
                        and not _p35_quote_exempt(blk)):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块与基准 %s 逐字相同（疑似未翻译）: %s"
                         % (bi + 1, ml, blk[:40]))
                    continue
                if (en and lg != "en" and bi < len(en) and nb == en[bi]
                        and not _p35_quote_exempt(blk)
                        and len(re.findall(r"\w+", blk)) >= COPY_BLOCK_WORDS):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块与英文逐字相同（疑似未翻译）: %s"
                         % (bi + 1, blk[:40]))


def review(finding, view):
    return finding
