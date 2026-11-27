# -*- coding: utf-8 -*-
"""P89：非拉丁文字语向的物种名录行，学名剥离后不得残留孤立拉丁词

REG215 实测：th 第 20 块（第 V 节第 2 行）写成
「เพลี้ยแป้งสีเทา Lepelley Dysmicoccus lepelleyi」——俗名里混入了拉丁残留
"Lepelley"（李比利氏的人名转写未译，直接把原词丢在了本语与学名之间）。
P30 对该词失明：latin_residue 的词频口径是「出现 ≥2 次才报」（min_count=2，
宿主再以 LATIN_SINGLE_SUSPECT 补单次可疑词），「Lepelley」全篇仅出现一次且
不在可疑表，静默漏网。本判据把扫描面收窄到「编号行 + 行内含学名结构」这一
名录行上下文（物种行是拉丁串唯一合法栖息地，残留即杂串），在该上下文内
**无视词频门槛**：学名（含 pv./var./subsp./race 分类后缀）与 ≥4 词连续拉丁
专名串（病毒英文名 Barley stripe mosaic virus 一类）剥离后仍有拉丁词即报。
判据复用 latin_residue 的完整剥离链（官方逐字英文串/引用串/学名结构/词表），
仅叠加行级上下文与词频豁免的收紧，不新增独立黑名单。

REG12/REG15/REG17 预演实测的两条官方形态豁免：①学名分类后缀词长不设上限（Pseudomonas syringae pv. actinidiae 的 actinidiae 9 字母，旧上限 4 会截断成残留）；②母版同块也有的拉丁词放行（商品名行「学名 Citrus sinensis，英文名 Orange」是官方双语标注，Orange/Pomelo 母版就有——沿用 P30「母版也有＝官方形态」的判准，行级放宽为同块任一行）；③Fusarium oxysporum f. sp. cubense 一类**双分类后缀**（f. sp.）整段剥离，种加词校验把 sr 拉丁字母书写变体的普通条款行排除在射程外。预演实测 REG215 el b20 与 REG39 el/he 同样存在 Lepelley 残留（人工审计漏网，判据上线即暴露）；存量真残留按 warning 持续可见，由各篇交付周期修复。档位 warning：与 P30 同族同置信度，残留词不在词表/母版/结构豁免内者报。"""
import re

from core.consts import NON_LATIN_SCRIPT_LANGS
from plugins._lang import latin_residue
from plugins._lexicon import latin_allow, latin_taxon
from plugins import _lexicon

RULE = "P89"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG215 th 实测：物种名录行「เพลี้ยแป้งสีเทา Lepelley Dysmicoccus "
          "lepelleyi」夹带孤立拉丁残留 Lepelley（人名转写未译），P30 词频口径"
          "（≥2 次才报 + 单次可疑白名单）对全篇仅 1 次的杂串失明。通用化：在"
          "「行首 (N)/（N）编号 + 行内含学名结构」的名录行上下文内，学名（含 "
          "pv./var./subsp./race 分类后缀）与 ≥4 词连续拉丁专名串（病毒英文名）"
          "剥离后仍残留拉丁词即报，无视词频门槛；剥离链复用 latin_residue "
          "（官方逐字英文串/引用串/学名结构/latin-taxon、latin-allow 词表），"
          "不新增黑名单。档位 warning：与 P30 同族同置信度；预演实测存量真残留"
          "（REG215/REG39 的 el、he 语 Lepelley，REG210 th plantago，REG30/89 "
          "Khapra 等）由本判据持续可见，各篇交付周期修复，故不设 error 阻塞。",
}

# 编号行：半角 `(1) ` 与全角 `（1）`
_STRROW = re.compile(r"^[\s>]*[\(（](\d{1,2})[\)）]\s*(.+)$")
# 学名结构（属名 + 种加词，可带属级大写引导）——名录行的"拉丁合法栖息地"特征
_TAXON_STRUCT = re.compile(r"\b([A-Z][a-z]{2,})\s+([a-z]{3,})\b")
# 学名整体（可带命名人 + 分类后缀链：`Fusarium oxysporum Schlecht f. sp.
# cubense Race 4`、`Pseudomonas syringae pv. actinidiae`、`Ralstonia
# solanacearum race 2`——命名人段可选、后缀 token 连续 0–2 个、词段在最后）
_TAXON_EXT = re.compile(
    r"\b[A-Z][a-z]{2,}\s+[a-z][a-z\-]{2,}"
    r"(?:\s+[A-Z][A-Za-z]{2,11}\.?)?"
    r"(?:\s+(?:pv\.?|var\.?|subsp\.?|spp\.?|race|f\.?\s?sp\.?)){0,2}"
    r"(?:\s+[A-Za-z0-9\-]{2,})?"
    r"(?:\s+[A-Z][A-Za-z]{2,11}\.?)?"
    r"(?:\s+Race\s*\d+)?\b")
# ≥4 词连续拉丁串：病毒英文名（Barley stripe mosaic virus）/官方串残段等专名。
# 词模式双字母起步——单字母会把 `Schlecht f. sp.` 的 f 当独立词，把学名+后缀链
# 从中间截断，反而漏掉 cubense（REG24 实测）。
_RUN4 = re.compile(
    r"(?<![A-Za-z])[A-Za-z][A-Za-z'\u2019\-]+"
    r"(?:\s+[A-Za-z][A-Za-z'\u2019\-]+){3,}(?![A-Za-z])")
_EN_CORE = re.compile(r"Exported to the People.s Republic of China")
_PARENS = re.compile(r"\([^)]*\)|\[[^\]]*\]|【[^】]*】|《[^》]*》")


def _pestline_stray(seg, allow, taxa):
    """名录行学名剥离后的孤立拉丁残留词表（空表 = 干净）。"""
    if not _STRROW.match(seg):
        return []
    body = _STRROW.match(seg).group(2)
    # 物种行判定：属名+种加词，且**种加词必须 ∈ taxa 词表**——sr 语向存在
    # 拉丁字母书写变体（REG216 实测「Srpska strana sprovodi…」整行拉丁），
    # 纯结构判定会把普通条款当物种行、把整行当「残留」；种加词校验后这类行
    # 早退。词表外新学名不判（漏判由 P30 全文级兜底），误红不可接受。
    m = _TAXON_STRUCT.search(body)
    if not (m and m.group(2).lower() in taxa):
        return []
    body = _EN_CORE.sub(" ", body)
    # 顺序有意义：先剥 ≥4 词连续拉丁专名串（Barley stripe mosaic virus 整串），
    # 再剥学名结构——反过来 _TAXON_EXT 会把 `Barley stripe` 截走，剩下
    # `mosaic virus` 两词反而漏进残留（REG122 形态实测）。
    body = _RUN4.sub(" ", body)
    body = _TAXON_EXT.sub(" ", body)
    body = _PARENS.sub(" ", body)
    res = latin_residue(body, 1, allow=allow, taxa=taxa)
    return sorted(res)


_LATIN_WORD = re.compile(r"[A-Za-z][A-Za-z'\u2019\-]*")


def _exempt_by_master(words, master_block):
    """母版同块也有的拉丁词 = 官方形态（商品名行「学名 X，英文名 Orange」）。

    P30 的 _verbatim_latin 要求 48 语同块一致，行级上下文里放宽为「本语残留
    词出现在 zh 母版同块任一行」即放行：商品名/学名行是官方双语标注形态，
    Orange/Pomelo/limes 一类英文名母版就有，不是未本地化残留；而 Lepelley
    这类杂串母版没有（zh 写的是「李比利氏」），照旧命中。
    """
    mw = {w.lower() for w in _LATIN_WORD.findall(master_block or "")}
    return [w for w in words if w.lower() not in mw]


def run(view, emit):
    _lexicon.set_official_en(view)
    allow = latin_allow(view)
    taxa = latin_taxon(view)
    for art in view.articles:
        ml = art.master_lang
        master_blocks = art.blocks(ml) if ml in art.parsed else []
        for lg in sorted(art.parsed):
            if lg not in NON_LATIN_SCRIPT_LANGS:
                continue
            for bi, block in enumerate(art.blocks(lg), 1):
                mb = master_blocks[bi - 1] if bi - 1 < len(master_blocks) else ""
                hit = None
                for line in block.splitlines():
                    words = _pestline_stray(line, allow, taxa)
                    if words:
                        rest = _exempt_by_master(words, mb)
                        if rest:
                            hit = (bi, rest)
                            break
                if hit:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第 %d 块名录行学名剥离后残留拉丁词（疑似杂串）: %s"
                         % (hit[0], "、".join(hit[1][:4])))
                    break


def review(finding, view):
    return finding
