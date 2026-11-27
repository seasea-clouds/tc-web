# -*- coding: utf-8 -*-
"""P82：拉丁学名缩写形制（属名缩写 + ASCII 点 + 小写种加词）

REG109 hy 实测把 `P. lilacinus` 写成 `P։ Lilacinus`：属名首字母后用本语
句号（U+0589），种加词首字母大写——两处都破坏了学名的可比对性。P79 只
逐字比对母版里的 `f. sp. / spp. / 命名人` 片段，单字母属名缩写不在射程。
本判据不依赖母版：凡 `X. 词` 形态，点为非 ASCII 即红；点为 ASCII 且词首
大写、词尾符合拉丁种加词常见后缀即红。`A. Smith` 一类人名缩写因后缀不符
不判。
"""
import re

RULE = "P82"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v2.25 立规（REG109 hy 实证）：学名缩写被本语句点替换 + 种加词首字母"
                    "大写，P65 只认完整「属名 种加词」，P79 只认种下加词与命名人，"
                    "两处都放行。判据按字形判：单字母属名后的点必须是 ASCII「.」，"
                    "种加词必须小写；不绑语向、不绑篇目。",
}

# 单字母 + 点 + 拉丁词；点涵盖本语常见句号：ASCII .、全角 ．、亚美尼亚 ։、中文 。
_ABBR_RE = re.compile(r"(?<![A-Za-z])([A-Z])([.．։。])\s*([A-Za-z][A-Za-z-]{2,})")
# 拉丁种加词常见后缀（用于区分人名缩写：Smith / Brown 不命中）
_EPITHET_RE = re.compile(
    r"(?:us|um|a|is|e|ii|ae|icola|ensis|ana|anum|atus|ata|atum)$", re.I)
_DOTS = {".", "．", "։", "。"}
# 罗马数字序号（I. / V. / X. 起首）与学名缩写同形，不参与判定
_ROMAN = set("IVXLCDM")


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            for bi, block in enumerate(art.blocks(lg)):
                hits = []
                for m in _ABBR_RE.finditer(block):
                    genus, dot, epithet = m.group(1), m.group(2), m.group(3)
                    if genus in _ROMAN:
                        continue                      # 罗马数字小节号
                    if m.start() == 0 or block[m.start() - 1] == "\n":
                        continue                      # 行首编号，不是句中缩写
                    if dot != ".":
                        hits.append("%s%s %s（点非 ASCII）" % (genus, dot, epithet))
                    elif epithet[0].isupper() and _EPITHET_RE.search(epithet):
                        hits.append("%s. %s（种加词首字母应小写）" % (genus, epithet))
                if hits:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块学名缩写形制错误：%s"
                         % (bi + 1, "、".join(hits[:3])))


def review(finding, view):
    return finding
