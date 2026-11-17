# -*- coding: utf-8 -*-
"""P67：富字段列表块的跨语向压缩离群＝整层字段漏译

母版一个多行列表块每行承载多个字段（台账/清单）时，若某语该块字符数短于母版
且不足同块各语长度比中位数的 45%，判整层文字字段漏译。块数/条目数/标记全对齐
时 P21–P26/P19/W02 一条不出声，只有这条能看见。
"""
from core.textutil import blocks
from plugins._lang import _p67_compression_hits

RULE = "P67"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.19 实测（C4 47 语逐篇人工审计）：th 的六行台账被压成「编号＋时间＋"
                    "结论」，提交方、驳回意见、审核人三层文字字段整层消失；块数、条目数、"
                    "列表标记、DA 编号、时间戳全部对齐，P21–P26/P19/W02/F07 一条不出声，"
                    "机检 0e/0w 仍靠主线程逐语直读才发现。只用字符长度比、不比字段数——"
                    "th/ar/ja 本来不靠逗号分字段（D2 b05/b23 实测 ar/th 密度 1.0 但信息"
                    "完整）。阈值由 50 个存量条目零误伤试算校准，射程＝母版每行平均 ≥2 "
                    "个分隔符且 ≥3 行的候选块，且要求 ≥10 语对齐才取中位数。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = blocks(art.master_body)
        langs = {lg: blocks(art.body(lg)) for lg in art.parsed if lg != ml}
        for lg, bi, ratio, med, rows, den in _p67_compression_hits(base, langs):
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "第%d块（%d行富字段列表，母版每行约%.1f个字段）疑似整层压缩："
                 "块长仅为 %s 母版的 %.2f 倍，同块各语中位数 %.2f 倍"
                 "（提交方/驳回意见/审核人一类文字字段逐行回读）"
                 % (bi, rows, den, ml, ratio, med))


def review(finding, view):
    return finding
