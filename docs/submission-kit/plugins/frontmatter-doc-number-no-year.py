# -*- coding: utf-8 -*-
"""F12：法规 frontmatter 的 doc_number 不得带年份

法定文号本身就是唯一标识（如 `GACC Announcement No. 150`），年份属于发布
元数据、已由 published_at 字段承载。部分稿件的 doc_number 写成
`GACC Announcement No. 150 (2026)`，与站方文号库比对时因多了年份而匹配不上。

只判 doc_number 字段里「括号包 4 位年」与「年第」两类明确的时间标注，
不扫正文、不把裸 4 位数字（可能就是公告序号）当年份误杀。
"""
import re

RULE = "F12"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点）
COVERAGE = {"langs": "all", "zones": ["frontmatter"]}

RATIONALE = {
    RULE: "存量 REG1/REG3 的 48 语 doc_number 写成 `GACC Announcement No. 150 "
          "(2026)` / `No. 219 (2025)`，站方按文号精确比对时因括注年份匹配不上；"
          "年份已由 published_at 字段承载，文号无需重复。只判括号包 4 位年与"
          "「YYYY 年第 N 号」里的年份标注两类形状，不把裸 4 位数字当年份——"
          "公告序号本身可能就是 4 位数。",
}

# 括号包 4 位年：(2026) / （2026） / 【2026】 / [2026]
_YEAR_PAREN = re.compile(r"[\(\（\[【]\s*(?:19|20)\d{2}\s*[\)\）\]】]")
# 「年第」时间标注：2026 年第 150 号 / 2026年150号（中文语境）
_YEAR_NIAN = re.compile(r"(?:19|20)\d{2}\s*年第?\s*\d")


def run(view, emit):
    for art in view.articles:
        if art.kind != "regulation":
            continue
        for lg in art.langs:
            fm = art.fm(lg)
            doc = str(fm.get("doc_number") or "")
            hits = [m.group(0) for m in _YEAR_PAREN.finditer(doc)]
            hits += [m.group(0) for m in _YEAR_NIAN.finditer(doc)]
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "doc_number 不应带年份 %s：%r（年份由 published_at 承载，"
                     "请从文号中去掉）" % (hits, doc))


def review(finding, view):
    return finding
