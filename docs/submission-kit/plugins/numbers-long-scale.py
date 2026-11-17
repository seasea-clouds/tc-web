# -*- coding: utf-8 -*-
"""P48：母版写「万亿」时，长级差语言不得用本语 10^18 的 tri- 词形

万亿 = 10^12；af/it/pt/ro/sq 等语把 0.36 万亿写成 triljoen/trilioni/trilhão，
数字原样、单位放大一百万倍，P36 看不见（数字没变）。

词表在 `lexicons` 的 `phrase-block`（用途 `long-scale-bad-unit`）：`value` 是
错写正则，`meta.good` 是本语正确形（建议文案要用）。受判语向＝该用途的键集合，
COVERAGE 里的语向表与它逐一对应——加一个语向只改库，不改这里。
"""
from core.consts import CN_UNIT_TRILLION as TRIGGER
from core.textutil import blocks as _blocks
from plugins._lexicon import phrase_block
from plugins._lexicon import hits as _hits

RULE = "P48"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程：zh 母版是触发条件（母版块含「万亿」才判），其余 21 语是受判面，
# 与 lexicons 里 long-scale-bad-unit 的键集合逐一对应（长级差语写 Trillion 是正解，不判）。
COVERAGE = {"langs": ["zh", "af", "ca", "cs", "da", "de", "es", "fi", "fr",
                      "hr", "hu", "it", "nl", "no", "pl", "pt", "ro", "sk",
                      "sl", "sq", "sr", "sv"],
            "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v1.54 实测（M1 47 语审校）：af/it/pt/ro/sq 五语把 0.36/0.43/0.6 万亿"
                    "写成 triljoen/trilioni/trilhão/trilioane/trilionë——短级差语言"
                    "的 trillion 是 10^18（长级差才是 10^12），数值被放大一百万倍，"
                    "而数字本身完全没变，P36/P19 都判绿。射程只含 long-scale-bad-unit "
                    "登记的 21 个短级差语向：长级差语（de/fr/es 等）写 Trillion 是正解，"
                    "不能一并判错。摘要层同扫（母版摘要含「万亿」时同样要求），"
                    "因此 zones 同时声明 frontmatter。",
}


def run(view, emit):
    table = phrase_block(view, "long-scale-bad-unit")
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = _blocks(art.master_body)
        if not any(TRIGGER in x for x in base):
            continue
        m_ex = str((art.fm(ml) or {}).get("excerpt", "") or "")
        for lg in sorted(art.parsed):
            entries = table.get(lg)
            if lg == ml or not entries:
                continue
            good = entries[0][1].get("good", "")
            for bi, blk in enumerate(_blocks(art.body(lg))):
                if bi >= len(base) or TRIGGER not in base[bi]:
                    continue
                hits = [h[0] for pat, meta in entries
                        for h in _hits(pat, meta["mode"], blk)]
                if hits:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块万亿单位误用 %r（10^18），应用 %s"
                         % (bi + 1, hits[0], good))
            if TRIGGER in m_ex:
                hits = [h[0] for pat, meta in entries
                        for h in _hits(
                            pat, meta["mode"],
                            str((art.fm(lg) or {}).get("excerpt", "") or ""))]
                if hits:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "摘要万亿单位误用 %r（10^18），应用 %s"
                         % (hits[0], good))


def review(finding, view):
    return finding
