# -*- coding: utf-8 -*-
"""P08：正文不得出现混文字系统词（同一 token 里拉丁字母与本语字母并存）

多为「英文关键词嵌进译文忘了本地化」的漏改事故，如阿拉伯词中夹拉丁字母。
编号/代码-连字符-本地后缀、大写代号＋本地词尾、单位符号＋格后缀等正当构词
有单独豁免，见 _health 里的三个豁免函数。
"""
import re

from core.consts import _MD_PH
from plugins._lexicon import phrase_block
from plugins._health import (
    _code_hyphen_ok, _p08_affix_ok, _p08_latin_stem_ok, _p08_unit_ok,
    _token_scripts,
)
from plugins._lang import _ATTACH_RE
from plugins._lexicon import latin_allow
from plugins._shared import fmt_hits

RULE = "P08"
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
    RULE: "v1.16 全量枚举（此前只报首个命中，修一处冒一处）：某语把「准入许可」"
                    "译成「准入lizenz」，同一 token 里西里尔与拉丁并存，读者看到的是"
                    "半译状态；这类漏改在 48 语批量回填时成片出现。v1.14/v1.58/v2.09/"
                    "v2.11 先后补四类正当构词豁免：编号-连字符-本地后缀（S1-ից）、"
                    "大写代号＋本地词尾（SKUها）、单位符号＋格后缀（g/m3-ից）、"
                    "逐字保留学名＋格后缀（tomentosus-ի）——不豁免会把 47 语正确译文"
                    "整片判红。v420（REG47 实测）：官方法定附件名的 `.docx` 后缀"
                    "与本语译名连写在 18 个非拉丁语向被报为混写词；P30 早已按"
                    "`_ATTACH_RE` 剥离同一形态，本判据补复用该机制。后缀必须逐字"
                    "保留、不能靠改稿加空格（会破坏文件名），故按判据口径回流。",
}


def _hits_in_body(body, lg, allow, cores, stems):
    """P08 的 token 扫描（插件 run 与自检臂共用，单一真值）。

    v420/REG47：官方法定附件名（`…套袋技术规范.docx`）整段剥离。P30 的
    `latin_residue` 早已按同一 `_ATTACH_RE` 口径剥离附件名——文件名后缀
    必须逐字保留，本语译名与拉丁后缀连写是文件名形态，不是「半译残留」；
    加空格反而破坏文件名。P08 此前未复用该机制，REG47 实测在 18 个非拉丁
    语向把 `Китай.docx` / `الصين.docx` / `პირობები.docx` 等报为混写词。
    """
    bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", _MD_PH, body)
    bare = re.sub(r"\[[^\]]*\]\([^)]*\)", _MD_PH, bare)
    bare = _ATTACH_RE.sub(" ", bare)
    hits = []
    for i, ln in enumerate(bare.split("\n"), 1):
        for tok in re.findall(r"\S+", ln):
            if "://" in tok or tok.startswith(("http", "/images")):
                continue
            if _code_hyphen_ok(tok, allow=allow):
                continue
            if _p08_affix_ok(tok, lg):
                continue
            if _p08_unit_ok(tok, cores):
                continue
            if _p08_latin_stem_ok(tok, stems):
                continue
            sc = _token_scripts(tok)
            others = sc - {"LATIN"}
            if ("LATIN" in sc and others) or len(others) >= 2:
                hits.append((i, "%r" % tok))
    return hits


def run(view, emit):
    cores = {w for w, _m in phrase_block(view, "p08-unit-core").get("*", ())}
    stems = {w for w, _m in phrase_block(view, "p08-latin-stem").get("*", ())}
    for art in view.articles:
        allow = latin_allow(view)
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            hits = _hits_in_body(body, lg, allow, cores, stems)
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "混文字系统词: " + fmt_hits(hits))


def review(finding, view):
    return finding
