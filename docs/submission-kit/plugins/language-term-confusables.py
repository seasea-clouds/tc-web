# -*- coding: utf-8 -*-
"""P84：跨语词形/搭配禁用表（数据驱动，新增只改 JSON）

人工逐语审计抓到的错形——拼写残缺、词义误配、标准号冗余、公告收尾语未译、
学名缩写走形——P08 混文字系统、P72 英文残词、P78 术语禁用形都不覆盖。判据
按语向维护闭类禁用表（本文件 ENTRIES）：该语正文命中 wrong 即红，并给出本语
正形；表可审计、可扩展，判据本身不含任何篇目 slug。
"""

from plugins import _lexicon

RULE = "P84"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v2.25 立规（REG109 全语审计实证）：hu `palléta`、ms `kebolehtelapan`、"
                    "ka `ხაისა`、ca `ISO 6/ISPM 6`、sw `mihuri imejaa` 这类错形，"
                    "语义判据全绿、拼写检查器又不认专名；人工审出的每一条都回写"
                    "数据表，下一篇同语同形直接拦。"
                    "REG121（2026-11-18 db-write-2）追加 6 条：pl 署名行机器幻觉 "
                    "`/Ja, Doris Duke,/`、sl `prostozidarskih`（共济会）误作海关、"
                    "be `бескантрольных партоў`（无管制港口）误作保税、ur `یہ نوٹس`"
                    "（通知）误作公告、ta `கப்பல் சுங்கத்துறை`（航运海关）误作中国海关、"
                    "ka `საბაჟო-საგადასახადო ზონის`（海关-税务区）误作保税区。",
}

# 数据即代码：工具包 data/ 目录受完整性清单保护，新增旁挂 JSON 会被隔离；
# 词表放在插件内，新增条目只追加本列表，不改判据逻辑。
_CACHE = None


def _entries():
    global _CACHE
    if _CACHE is None:
        by_lang = {}
        for lang, wrong, right in _lexicon.judge_pairs(RULE):
            by_lang.setdefault(lang, []).append((wrong, right))
        # 长错形优先，避免 `palléták` 同时再报一次 `palléta`
        for lg in by_lang:
            by_lang[lg].sort(key=lambda x: len(x[0]), reverse=True)
        _CACHE = by_lang
    return _CACHE


def run(view, emit):
    _lexicon.set_judge(view, RULE)
    by_lang = _entries()
    for art in view.articles:
        for lg in sorted(art.parsed):
            entries = by_lang.get(lg)
            if not entries:
                continue
            for bi, block in enumerate(art.blocks(lg)):
                taken = []
                for wrong, right in entries:
                    if wrong in block and not any(wrong in t for t in taken):
                        taken.append(wrong)
                        emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                             "第%d块命中禁用词形「%s」→ 本语正形「%s」"
                             % (bi + 1, wrong, right))


def review(finding, view):
    return finding
