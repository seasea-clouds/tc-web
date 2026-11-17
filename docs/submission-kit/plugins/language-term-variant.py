# -*- coding: utf-8 -*-
"""P64：同篇术语异形混用（正形与登记错形并见才提示）

正形与错形在同一篇里同时出现，说明改稿只改了一半；建议统一为前者。
词对登记在 `lexicons` 的 `term-variant`（语向 → 错形/正形/说明），增补语向
不必改代码。
"""
from plugins._lexicon import term_variant

RULE = "P64"
RULES = [RULE]
PHASE = 40
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v2.10 立规（REG15 审计）：同一篇里正形与登记错形并存（如 uk 的两种"
                    "转写），说明批量替换只改了一半，读者在同一页看到同一术语两种写法。"
                    "判据只判「并存」不判「错形单独出现」——单独出现可能是合法异体，"
                    "并存才是改稿不彻底的确证。档位 warning：术语统一属编辑质量，"
                    "不阻断打包。",
}


def run(view, emit):
    table = term_variant(view)
    for art in view.articles:
        for lg in sorted(art.parsed):
            fm = art.fm(lg) or {}
            whole = "\n".join([art.body(lg) or "",
                               str(fm.get("excerpt", "")),
                               str(fm.get("title", ""))])
            for good, bad, label in table.get(lg, ()):
                if good in whole and bad in whole:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "同篇术语异形混用：%r 与 %r（%s；建议统一为前者）"
                         % (good, bad, label))


def review(finding, view):
    return finding
