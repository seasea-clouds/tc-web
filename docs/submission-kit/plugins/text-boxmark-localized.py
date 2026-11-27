# -*- coding: utf-8 -*-
"""P101：非英语语向的包装标识不得只有英文逐字串

REG259 实测：22 个语种第 99 行只写 “Exported to the People’s Republic of
China”，没有本语标注形；P90 只校验英文串撇号，不校验是否缺本语译形，
机检全绿。本判据要求：除 zh 母版与 en 外，含英文逐字串的同一段必须另有
本语文字（非 ASCII 字符，或英文串之外的引号内容）。
"""
import re

RULE = "P101"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body", "master"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG259 实测：47 语中 22 语包装标识只写英文逐字串，缺本语标注形；"
          "P90 只锁撇号字节，P56/L04 也只锁原样串，均看不见「本语译形缺失」。"
          "通用化：非 zh/en 语向凡含英文逐字串的段落，必须同时出现本语文字"
          "（非 ASCII 字符或英文串之外的引号内容），否则报缺本语标注形。"
          "档位 warning：个别语向可能以纯拉丁本语词形书写且不加引号，先交"
          "人工裁定；英文逐字串本身仍由 P90 锁字节。",
}

MARK = "Exported to the People’s Republic of China"
_QUOTED = re.compile(r"[“«„「『\"]([^”»」』\"]{3,})[”»」』\"]")


def _has_local(block):
    rest = block.replace(MARK, "")
    if any(ord(ch) > 127 and ch.isalpha() for ch in rest):
        return True
    return any(m.group(1).strip() for m in _QUOTED.finditer(rest))


def run(view, emit):
    for art in view.articles:
        ml = art.master_lang
        for lg in sorted(art.parsed):
            if lg in (ml, "en"):
                continue
            for block in (art.body(lg) or "").split("\n\n"):
                if MARK in block and not _has_local(block):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "包装标识只有英文逐字串，缺本语标注形")


def review(finding, view):
    return finding
