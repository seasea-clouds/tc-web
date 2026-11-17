# -*- coding: utf-8 -*-
"""P53：葡语变体同篇不得混用（欧葡 / 巴葡各自成篇合法，混写才是事故）

变体对在 `lexicons` 的 phrase-block（用途 p53-variant-pairs）：value 是
欧葡形，meta.pair 是巴葡形；增补改库即可。
"""
from plugins._lexicon import phrase_block

RULE = "P53"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["pt"], "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v1.56 实测：pt 篇里同时出现「registo」（欧葡）与「registro」（巴葡）、"
                    "「utilização」与「utilização/uso」两套用法，同一篇里两个来源的译文"
                    "拼在一起。站方只提供一个 pt 语向，欧葡/巴葡各自成篇都合法，混写才是"
                    "事故——因此判据只判「同篇并存」，不指定用哪一套。射程锁 pt，正文与"
                    "标题/摘要都扫。",
}


def run(view, emit):
    pairs = [(v, m.get("pair", ""))
             for v, m in phrase_block(view, "p53-variant-pairs")
             .get("*", ()) if m.get("pair")]
    for art in view.articles:
        if "pt" not in art.parsed:
            continue
        fm = art.fm("pt") or {}
        whole = "\n".join([art.body("pt") or "",
                           str(fm.get("excerpt", "")),
                           str(fm.get("title", ""))])
        low = whole.lower()
        both = [(eu, br) for eu, br in pairs
                if eu in low and br in low]
        if both:
            emit(RULE, SEVERITY, "pt/%s" % art.slug,
                 "葡语变体同篇混用："
                 + "、".join("%s×%s" % p for p in both)
                 + "（欧葡/巴葡各自成篇合法，混写才是事故）")


def review(finding, view):
    return finding
