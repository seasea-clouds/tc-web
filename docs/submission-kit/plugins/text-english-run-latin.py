# -*- coding: utf-8 -*-
"""P87：拉丁字母语种正文整段英文残留

REG93 实测：id 第 15 块整段保留英文，sv 第 14 块也夹了整句英文；P30 只查
非拉丁文字语向，拉丁语种里的整段英文因此漏网。判据在拉丁字母目标语里找连续
≥10 个英文词、其中 ≥3 个英语功能词、且含 the/shall 强标记的片段；命中即报。
不用 in/of 这类跨语同形词作判据（it/nl 实测误报）。
"""
import re

from plugins import _lexicon

RULE = "P87"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 拉丁字母目标语（en 为源语言，不在内）；只扫这些语向的正文块
COVERAGE = {"langs": ["af", "az", "ca", "cs", "da", "de", "es", "fi", "fr",
                      "hr", "hu", "id", "it", "ms", "nl", "no", "pl", "pt",
                      "ro", "sk", "sl", "sq", "sv", "sw", "tr", "vi"],
            "zones": ["body"]}

RATIONALE = {
    RULE: "REG93 实测：id 第 15 块整段英文（\"The import of biological materials...\"）"
                    "留在成品里；P30 只对非拉丁文字语向报「夹用英文原词」，拉丁"
                    "语种整段英文既不像外来术语、也不触发 P30。人工逐语审核在 id"
                    "第 15 块发现后，通用化为本判据：连续 ≥10 个英文词且含 ≥3 个"
                    "英语功能词，并要求出现 the/shall 强标记（in/of 等跨语同形词"
                    "不作判据，避免 it/nl 误报）；英文串字母量须占全块 ≥50%，"
                    "法定声明起首（This consignment / CERTIFIED TRUE COPY）放行，"
                    "避免把本语正文里的英文机构名或证书附加声明误判为漏译。档位"
                    "error：整段未翻译属交付级缺陷。",
}

_FUNC = set("""the and of for with from this that these those is are was were
has have had will shall should would can could may might must under its their
which who whom whose not than then there here such""".split())
_RUN = re.compile(r"[A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){9,}")
_WORD = re.compile(r"[A-Za-z][A-Za-z'’-]*")
# 法定英文声明起首：证书附加声明、正本证明，属逐字保留，不是漏译
_DECL_RE = re.compile(r"(?is)^\s*(This consignment|CERTIFIED TRUE COPY|"
                     r"This is to certify|The undersigned|We hereby certify|"
                     r"I hereby declare)")
# 官方机构/议定书名：这些英文专名嵌在本语正文里是规范写法，不是漏译
_PROPER = {"administration", "customs", "republic", "people's", "ministry",
           "protocol", "state", "department", "commission", "agency"}


def _english_runs(block):
    """疑似整段英文的连续词串 [(words, function_word_count)]。

    官方逐字保留串（lexicons official-en-literal）先整串剥离；法定声明起首
    （This consignment / CERTIFIED TRUE COPY 等）直接放行。此外要求该
    英文串的字母量占全块 ≥50%：本语正文里夹一个英文机构名不算漏译。
    """
    _official = _lexicon.official_en()
    if _official is not None:
        block = _official.sub(" ", block)
    total = sum(1 for ch in block if ch.isalpha())
    if not total:
        return []
    out = []
    for m in _RUN.finditer(block):
        if _DECL_RE.match(m.group(0)):
            continue
        words = _WORD.findall(m.group(0))
        low = [w.lower().replace("’", "'") for w in words]
        func = sum(1 for w in low if w in _FUNC)
        proper = sum(1 for w in low if w.strip("'s") in _PROPER)
        if proper >= 2:
            continue
        en_letters = sum(len(w) for w in words)
        if (len(words) >= 10 and func >= 3 and en_letters / total >= 0.5
                and ("the" in low or "shall" in low)):
            out.append((words, func))
    return out


def run(view, emit):
    _lexicon.set_official_en(view)
    for art in view.articles:
        for lg in sorted(art.parsed):
            if lg not in COVERAGE["langs"]:
                continue
            for bi, block in enumerate(art.blocks(lg), 1):
                hits = _english_runs(block)
                if hits:
                    words, func = hits[0]
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第 %d 块疑似整段英文残留（%d 词，功能词 %d）：%s"
                         % (bi, len(words), func, " ".join(words[:8])))
                    break


def review(finding, view):
    return finding
