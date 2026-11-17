# -*- coding: utf-8 -*-
"""P47：母版「N 位」的描述位数字必须在译文同块存活

P36 只收「含小数点或 ≥3 位」、P19 只收 ≥10 的非年份整数，「8 位税号」的 8
两族都看不见。契约：母版块出现「N 位」，各语同一块必须把 N 写出来——独立数字、
本族数字折叠、复合屈折词干（achtstellige / восьмизначных）、或 NUMBER_WORDS
数词，任一形态在场即可。定位是「防整段丢失」，不做逐事实归属。
"""
from core.consts import _DIGIT_DESC
from core.textutil import _ascii_digits, _block_kind, digit_word_present

RULE = "P47"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.52 r79 全量数字对账抓到的真缺陷就在这里：母版「正面清单 1476 个"
                    "8 位税号」，清单规模 1476 三族都查，修饰它的「8 位」在 ta 译文"
                    "被写成无义的 எண்படி，「八位」整段丢失，其余判据全绿。"
                    "A08 反向教训：词干/数词表只覆盖「八」，拿 eight 顶替目标值 5 的"
                    "语向曾被判通过，因此 n≠8 时只认独立数字与 NUMBER_WORDS。"
                    "已知边界：块内已有别的同数值词（「八部门」的 eight）时会放过"
                    "单点错写——本条定位是防整段丢失，不做逐事实归属。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        want = [sorted({int(m.group(1)) for m in _DIGIT_DESC.finditer(x)})
                for x in art.blocks(ml)]
        if not any(want):
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            for bi, blk in enumerate(art.blocks(lg)):
                if bi >= len(want) or not want[bi]:
                    continue
                if _block_kind(blk) in ("TABLE", "CODE", "IMG"):
                    continue
                folded = _ascii_digits(blk)
                low = folded.casefold()
                miss = [n for n in want[bi]
                        if not digit_word_present(lg, n, folded, low)]
                if miss:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块母版「%s 位」的位数 %s 在译文缺失"
                         "（须以数字或数词写出）"
                         % (bi + 1,
                            "、".join(str(n) for n in want[bi]),
                            "、".join(str(n) for n in miss)))


def review(finding, view):
    return finding
