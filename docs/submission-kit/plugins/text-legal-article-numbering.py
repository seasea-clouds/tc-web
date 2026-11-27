# -*- coding: utf-8 -*-
"""P102：zh 母版写「第六条」时，译文不得把它降格成「章/节」

REG259 实测：en/es/fr/de/ja/ko/pt/ru 等 30 余语把「第六条」译成
Chapter/chapitre/capítulo/Kapitel/章/节；条号与章号混用会让读者按错误
层级查找。判据只在 zh 母版确实出现「第六条」时启用，按各语常见
chapter 词根 + 罗马数字 VI 的邻近形态报警。
"""
import re

RULE = "P102"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG259 实测：官方条文「第六条第（六）款」在 30 余语被译成"
          "Chapter/chapitre/capítulo/Kapitel/hoofdstuk/章/节，条号降格为章号；"
          "P22/P23 只查序号形状，不查「条」与「章」的语义层级。"
          "通用化：zh 母版含「第六条」时，非 zh 译文若出现 chapter 词根与"
          "罗马数字 VI 的邻近组合即报；要求改用本语 Article/条词根。"
          "档位 warning：个别法律体系 chapter 与 article 术语可能同名，"
          "交人工复核，不直接判 error。",
}

_WORD = (r"(?:chapter|chapitre|capítulo|capitulo|kapitel|hoofdstuk|capo|"
         r"capitol|rozdział|rozdzial|kapitola|глава|главы|κεφάλαιο|"
         r"κεφαλαίου|פרק|അധ്യായം|அத்தியாயம்|bölüm|fejezet|หมวด|खंड)")
_NEAR = re.compile(
    r"(?is)\b%s\b.{0,24}\bVI\b|\bVI\b.{0,24}\b%s\b" % (_WORD, _WORD)
)


def run(view, emit):
    for art in view.articles:
        ml = art.master_lang
        if ml not in art.parsed:
            continue
        master = "\n".join(art.blocks(ml))
        if "第六条" not in master:
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            for block in art.blocks(lg):
                m = _NEAR.search(block)
                if m:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "「第六条」被译成章/节: %r" % m.group(0)[:80])


def review(finding, view):
    return finding
