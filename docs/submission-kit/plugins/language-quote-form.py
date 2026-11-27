# -*- coding: utf-8 -*-
"""P81：ASCII 直引号 / 词内撇号形制不合本语正字法

REG89 阶段 5-a 回流：非拉丁文字语向正文出现 ASCII `"` 即红；ASCII `'` 紧贴
本语字母（词内缩写/音译形，如 מס' 486、טיינג'ין，应为 geresh ׳ U+05F3）即红。
拉丁字母语向只报「引号紧贴字母、左右无空格」的词内 `"` 形状；拉丁语向撇号
（d'ús / l'emploi）与白俄·乌克兰原生撇号（суб'ект / об'єкт）整族放行。

说明：本条早期版本曾按「低开双引号 „ 只属德语及中东欧闭类」做存在即红，
实测 REG89 26 语内平衡的 „…“ / „…” 成对出现（af/az/da/fi 等），属统一的
本地引号形制，存在即红会整片误报；开闭错配由 P60 覆盖、跨族错配由 P63
覆盖，本条不再按存在性判 LOW9。
"""
import re

from core.consts import NON_LATIN_SCRIPT_LANGS, SCRIPT_TESTS

RULE = "P81"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG89 阶段 5-a 回流（48 语向实测）：ASCII 双引号仅 es×46、ms×62，"
                    "两处都是带空格的合法直引号（`el \"pago\"`），拉丁语向词内"
                    "形状才报；ASCII 单引号 he×19（טיינג'ין / צ'ונגצ'ינג 类"
                    "希伯来音译词内，应为 geresh ׳ U+05F3），scripted 语向紧贴"
                    "字母即红；be/uk 撇号是本语构词成分（суб'ект / об'єкт），"
                    "整族放行；ca/fr/it 拉丁语向撇号 d'ús / l'emploi 同样放行。"
                    "LOW9（„ 低开引号）存在性判定已撤除：REG89 实测 af/az/da/fi/"
                    "cs/sk/sl/sq 等多语成对内平衡使用 „…“ / „…”，是统一本地"
                    "形制，存在即红会整片误报；开闭错配归 P60、跨族错配归 P63。",
}

# 本语正字法原生使用 ASCII 撇号的 scripted 语向（白俄罗斯/乌克兰语撇号
# 是构词成分，如 суб'ект / об'єкт）；这些语向的 `'` 不判为英文残留。
_APOSTROPHE_NATIVE = {"be", "uk"}

_LINK_RE = re.compile(r"!?\[[^\]]*\]\([^)]*\)")
_ASCII_LETTER = re.compile(r"[A-Za-z]")


def _script_pat(lg):
    pat = SCRIPT_TESTS.get(lg)
    return re.compile(pat) if pat else None


def _ascii_quote_hits(block, lg):
    """返回该块内不合正字法的 ASCII 直引号命中 [(位置, 字符)]。"""
    out = []
    scripted = lg in NON_LATIN_SCRIPT_LANGS
    sp = _script_pat(lg)
    for i, ch in enumerate(block):
        if ch == '"':
            if scripted:
                out.append((i, ch))
            else:
                # 拉丁语向：只认左右都是字母的词内紧贴形状
                left = block[i - 1] if i > 0 else ""
                right = block[i + 1] if i + 1 < len(block) else ""
                if _ASCII_LETTER.match(left or "") and _ASCII_LETTER.match(right or ""):
                    out.append((i, ch))
        elif ch == "'":
            if not scripted or lg in _APOSTROPHE_NATIVE:
                continue          # 拉丁语向撇号 / 白俄·乌克兰原生撇号是本语正字法
            left = block[i - 1] if i > 0 else ""
            right = block[i + 1] if i + 1 < len(block) else ""
            near = (sp and ((left and sp.match(left)) or (right and sp.match(right))))
            if near:
                out.append((i, ch))
    return out


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            blocks = art.blocks(lg)
            hits = []
            for bi, block in enumerate(blocks):
                clean = _LINK_RE.sub(" ", block)
                for _pos, ch in _ascii_quote_hits(clean, lg):
                    hits.append((bi + 1, ch))
            if hits:
                detail = ("第%s块出现 ASCII 直引号（scripted 语向应为本语引号/"
                          "geresh ׳；拉丁语向词内直引号应改为本语引号形制）"
                          % "、".join("块%d" % b for b, _ in hits[:3]))
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), detail)


def review(finding, view):
    return finding
