# -*- coding: utf-8 -*-
"""P79：学名的种下加词与命名人缩写必须逐字保留

P65 只认「属名 种加词」，而 REG109 实测 hy 把
`Fusarium oxysporum Schlecht f. sp. cubense Race 4` 里的点替换成本语句号
（`f։ Sp։ Cubense`）——属名种加词仍在，P65 全绿，读者拿到的学名却已不可比对。
本判据按母版同块提取 `f. sp. 加词`、`spp.` 与命名人缩写（`L.`/`Schlecht` 一类
拉丁词后的单字母点），要求各语同一块逐字出现；本地句末标点一旦混入学名即红。
"""
import re


RULE = "P79"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v2.24 立规（REG109 hy 实证）：学名被本语句点替换后，P65 因只比属名"
                    "种加词而放行；官方证书按学名核对，种下加词错一个字即不同号。"
                    "判据只从母版提取「f. sp. 加词 / spp. / 命名人缩写」三类片段，"
                    "要求同块逐字出现——不做翻译质量判断，只判法定标识的字节完整性。",
}

# `f. sp. cubense` / `f.sp. cubense`（母版怎么写就怎么提）
_INFRA_RE = re.compile(r"\bf\.\s*sp\.\s*[a-z][a-z-]{2,}")
# `spp.` / `sp.`（属级未定种，同样按字节比对）
_SPP_RE = re.compile(r"\b(?:spp|sp)\.")
# 命名人缩写：单个大写字母加点，且前接拉丁词（`L.` 在 `Prunus salicina L.` 里）
_AUTHOR_RE = re.compile(r"\b[A-Z]\.(?=\s|$)")


def _tokens(block):
    out = []
    out += _INFRA_RE.findall(block)
    out += _SPP_RE.findall(block)
    out += _AUTHOR_RE.findall(block)
    return sorted(set(out))


def run(view, emit):
    for art in view.articles:
        ml = art.master_lang
        m_body = art.master_body
        if "<!-- original -->" not in m_body:
            continue
        by_block = [_tokens(b) for b in art.blocks(ml)]
        if not any(by_block):
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = art.blocks(lg)
            for bi, toks in enumerate(by_block):
                text = cur[bi] if bi < len(cur) else ""
                miss = [t for t in toks if t not in text]
                if miss:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块学名片段未逐字保留：%s（本地句末标点不得替换学名内部的点）"
                         % (bi + 1, "、".join(miss[:3])))


def review(finding, view):
    return finding
