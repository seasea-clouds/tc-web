# -*- coding: utf-8 -*-
"""P30：非拉丁文字语向的正文不得夹用普通英文原词

中文母版写「保税」，ja/ko/es/ar 等各自本地化了，但 30 多个语言正文里保留了
bonded（bonded 台账 / bonded 仓）——同一术语有的翻译、有的照抄英文。
"""
from core.consts import (
    LATIN_SINGLE_SUSPECT, NON_LATIN_SCRIPT_LANGS, _LATIN_WORD_RE,
)
from plugins._lang import latin_residue
from plugins._lexicon import latin_allow, latin_taxon

RULE = "P30"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.20 实测：同一批 48 语稿里 bonded 一词有 12 语译了、30 语照抄，"
                    "读者在同一篇里看到「保税仓」与「bonded 仓」两种写法。判据只在"
                    "非拉丁文字语向生效——拉丁语向的英文残留归 P52（那里能按本语词形"
                    "判「该译没译」，这里只能判「不该出现拉丁词」）。I12 把 1 次 ≥2 扫描"
                    "＋6 次逐词扫描合并为一次 latin_residue，实测调用数从 7 降到 1。"
                    "v2.26 起按**结构**豁免法定拉丁串（学名/双语名标注/官方议定书名/"
                    "附件名），并对「48 语同块一致 + 母版也有」的串整串放行——这两条"
                    "都不依赖篇目，也不依赖词表枚举完整。连续 ≥6 个拉丁词的整句也"
                    "按引用剥离：法定英文声明（`Chia seed to be exported to China "
                    "shall be packed…`）没有稳定字面量，逐条登记永远追不上新公告；"
                    "整段漏译不归本判据管（word-level 判据只管夹用单字），由人工"
                    "语义审计兜底。",
}


def _verbatim_latin(art):
    """该篇所有语向同块一致出现的拉丁词（小写）＝法定逐字保留串。

    2026-11-15：这是「学名/官方缩写」最根本的判据——不靠词表枚举。官方文本
    里的拉丁串（`Diaporthe vaccinii`、`GMT+8`、议定书名）在 48 语里逐字相同，
    且 zh 母版本身就有；未本地化残留不会同时满足这两条（母版是中文，译者
    也会各自处理）。

    母版自身不参与豁免：母版若夹了英文，P30 仍会点出来——那本来就该改母版，
    而不是让 48 语跟着照抄。

    与 latin-taxon 词表是互补关系：词表管「单语向独立可判」的常见属名，
    本函数管「词表没收录、但全篇一致」的新属名/新缩写。
    """
    ml = art.master_lang
    per_lang = {}
    for lg in art.parsed:
        per_lang[lg] = art.blocks(lg)
    if ml not in per_lang:
        return frozenset()
    out = set()
    master_blocks = per_lang[ml]
    for bi in range(len(master_blocks)):
        sets = []
        for lg, bl in per_lang.items():
            txt = bl[bi] if bi < len(bl) else ""
            sets.append({w.lower() for w in _LATIN_WORD_RE.findall(txt)})
        if len(sets) < 3:            # 语向太少时不作数，避免两三语照抄即放行
            continue
        out |= set.intersection(*sets)
    return frozenset(out)


def run(view, emit):
    allow = latin_allow(view)
    taxa = latin_taxon(view)
    for art in view.articles:
        shared = _verbatim_latin(art)
        for lg in sorted(art.parsed):
            if lg not in NON_LATIN_SCRIPT_LANGS:
                continue
            # shared ⊆ 母版词集（它要求每个语向都有该词），所以母版也能用：
            # 母版独有的英文不在 shared 里，照旧被报。
            own_allow = allow | shared
            all1 = latin_residue(art.body(lg) or "", 1,
                                 allow=own_allow, taxa=taxa)
            res = {w: n for w, n in all1.items() if n >= 2}
            for w in LATIN_SINGLE_SUSPECT:
                if w in all1:
                    res.setdefault(w, all1[w])
            if not res:
                continue
            top = sorted(res.items(), key=lambda x: -x[1])[:5]
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "正文夹用英文原词（疑似未本地化）: %s"
                 % ", ".join("%s(%d)" % (w, n) for w, n in top))


def review(finding, view):
    return finding
