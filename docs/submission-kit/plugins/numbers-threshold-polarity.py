# -*- coding: utf-8 -*-
"""P59：本数式极性——母版「N% 以上」含本数，译文不得写成严格大于

立法技术规范：「以上」含本数（≥N）。译文若把门槛写成「超过 N」/«выше N»/
«plus de N»，读者会漏掉恰为 N 的那一档。块数不对齐时不判（错位比对会张冠李戴，
P23 已另行报「逐块一一对应」）。
"""
from __future__ import annotations

import re

from core.consts import P59_MASTER_ANCHOR, P59_NEGWORDS
from core.textutil import blocks as _blocks
from plugins._lexicon import phrase_block

RULE = "P59"
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
    RULE: "v2.01 实测（A6 法规篇目 47 语审读）：母版写「10% 以上」（含本数 ≥10，"
                    "立法技术规范），en/ru/fr 等语译成 more than 10% / выше 10% / "
                    "plus de 10%，恰好卡在 10% 的申请人被排除在门槛外；数字本身一致，"
                    "P36/P55/P19 全绿，只有语义极性判据能抓。射程＝母版含「N% 以上」"
                    "锚的块（全语料实测仅 A6 两块），因此不会对一般比较句误报；"
                    "否定词在比较词左侧（«не выше 10%»）或匹配串内部时豁免，"
                    "那正是「不超过」的合法写法。",
}


def exclusive_threshold_hits(templates, lang, text, nums):
    """译文块里「严格大于比较形直接带母版阈值数字」的命中串。

    模板本身是数据（`lexicons` 的 `phrase-block`，用途 `threshold-exclusive`），
    「怎么判」（把 `{N}` 换成候选数字、否定词豁免）是判据，留在插件里。
    2026-11-15 从 `core/textutil.py` 下沉：那条函数只有本插件调用，放在 core
    等于让一条规则拥有全库公共层，改判据要动公共文件。
    """
    out = []
    if not nums or not lang:
        return out
    alt = "|".join(re.escape(n) for n in nums)
    for tpl, _meta in templates.get(lang, ()):
        if "{N}" not in tpl:
            continue
        try:
            rx = re.compile(tpl.replace("{N}", "(?:%s)" % alt), re.UNICODE)
        except re.error:
            continue
        for m in rx.finditer(text):
            seg = m.group(0).lower()
            if any(w in seg for w in P59_NEGWORDS):
                continue        # 否定词夹在匹配串内部
            left = text[max(0, m.start() - 12):m.start()].lower()
            if any(left.endswith(w) or (w.strip() in left[-4:] and
                                        left.rstrip().endswith(w.strip()))
                   for w in P59_NEGWORDS):
                continue        # 否定词在比较词左侧（«не выше 10%»）
            out.append(m.group(0))
    return out


def run(view, emit):
    templates = phrase_block(view, "threshold-exclusive")
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        zh = _blocks(art.master_body)
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = _blocks(art.body(lg))
            if len(cur) != len(zh):
                continue
            hits = []
            for pi, zblk in enumerate(zh):
                nums = P59_MASTER_ANCHOR.findall(zblk)
                if not nums:
                    continue
                for h in exclusive_threshold_hits(templates, lg, cur[pi], nums):
                    hits.append((pi + 1, "/".join(nums), h))
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     u"本数式极性：母版「N% 以上」含本数（≥N，立法技术规范），"
                     u"译文把门槛写成严格大于 "
                     + u"；".join(u"块%d 母版阈值 %s%% 译文 %r" % (bi, th, h)
                                  for bi, th, h in hits[:3])
                     + (u"；等共 %d 处" % len(hits) if len(hits) > 3 else u""))


def review(finding, view):
    return finding
