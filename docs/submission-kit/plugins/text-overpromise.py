# -*- coding: utf-8 -*-
"""R06：正文不得出现过度承诺（寄样安排 / 保证 / 时限）

承诺「保证通过」「一定放行」「免费寄样」把结果写死，与 R04 的时限承诺同源
但落点是结果与资源，词表分两套。

词表在 `lexicons` 的 `phrase-block`（用途 `promise`）：`*` 是全库共用的
英文正则，其余按语向登记。增补语向改库即可，不动代码。
"""
from plugins._lexicon import hits as _hits
from plugins._lexicon import phrase_block

RULE = "R06"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.10 起执行：早期文案写过「保证清关通过」「免费寄样」，被读者当作"
                    "合同条款引用，实际审批权在海关，寄样由销售按客户资质决定。"
                    "两套词表都在 lexicons 的 phrase-block（用途 promise）："
                    "`*` 行是多语共用词形（guarantee / 保证通过 / garantieren），"
                    "语向行是单语专属说法（各语「包过」「一定放行」的地方表达），"
                    "两套都查，命中即报、每语一处。",
}


def run(view, emit):
    table = phrase_block(view, "promise")
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            hit = None
            for pat, meta in table.get("*", ()):
                found = _hits(pat, meta["mode"], body)
                if found:
                    hit = found[0][0]
                    break
            if not hit:
                for pat, meta in table.get(lg, ()):
                    found = _hits(pat, meta["mode"], body)
                    if found:
                        hit = found[0][0]
                        break
            if hit:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "正文出现过度承诺（寄样安排/保证/时限）: %r" % hit)


def review(finding, view):
    return finding
