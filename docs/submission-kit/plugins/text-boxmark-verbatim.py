# -*- coding: utf-8 -*-
"""P89：盒标英文原样串必须与本篇 zh 母版逐字节一致（撇号形态防线）

REG9/REG19 实测（2026-11-19 全语料扫描）：zh 母版盒标串为
「Exported to the People's Republic of China」（U+2019），但 REG9 有 22 语、
REG19 有 17 语把串写成了 ASCII 撇号 People's——原样保留串被静默改写。
现行的 P30/官方串剥离只要求「能剥掉就行」（official-en-literal 两种撇号
都兼容），从不校验译语串与母版串逐字节一致；人名撇号形态 ' 与 ’ 在阅读上
几乎无差，但「原样保留」的口径是字节级。本判据以本篇 zh 母版为基准逐语比对
盒标英文串撇号，不一致即报；不预设唯一「正确」撇号（存量母版两派并存，
判据只锁「译语＝母版」，对存量零假红）。
"""
import re

RULE = "P90"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "2026-11-19 全语料扫描实测：盒标英文串「Exported to the People's "
          "Republic of China」的撇号在 zh 母版两派并存（REG9/19/23/32/215 "
          "为 U+2019，REG10-18 等老篇为 ASCII），且 REG9 有 22 语、REG19 有 "
          "17 语译语撇号与本篇母版不一致——原样保留串被静默改写而无判据覆盖"
          "（P30/官方串剥离只求「剥得掉」，从不校验字节一致）。通用化：以本篇 "
          "zh 母版串为基准，逐语比对盒标英文串撇号形态，不一致即报；不预设"
          "全局唯一正形，判据只锁「译语＝母版」，存量零假红。档位 error："
          "原样串属站方要求逐字保留的法定串，被改写即交付级缺陷。",
}

_MARK = re.compile(r"Exported to the People(.)s Republic of China")


def _apostrophe_diff(master_body, lg_body):
    """→ 与母版撇号不一致的撇号集合（空集 = 一致；母版无串 = () 跳过）。"""
    zs = {m.group(1) for m in _MARK.finditer(master_body or "")}
    if not zs:
        return set()
    ls = {m.group(1) for m in _MARK.finditer(lg_body or "")}
    return ls - zs


def run(view, emit):
    for art in view.articles:
        ml = art.master_lang
        if ml not in art.parsed:
            continue
        master_body = "\n".join(art.blocks(ml))
        zs = {m.group(1) for m in _MARK.finditer(master_body)}
        if not zs:
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            lg_body = "\n".join(art.blocks(lg))
            bad = _apostrophe_diff(master_body, lg_body)
            if bad:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "盒标英文串撇号 %s 与母版 %s 不一致（原样串须逐字节一致）"
                     % ("/".join(repr(x) for x in sorted(bad)),
                        "/".join(repr(x) for x in sorted(zs))))


def review(finding, view):
    return finding
