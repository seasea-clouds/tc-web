# -*- coding: utf-8 -*-
"""S03：content/<lang>/ 下的语言码必须是策略库注册的 48 语之一。

不判「语文是否齐全」（S02 管缺语），只判「目录名是不是合法语言码」。
"""

RULE = "S03"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["mdx"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package']}

RATIONALE = {
    RULE: "2026-11-07 实测：某批次把 content/uk_UA/ 与 content/pt-BR/ 当成语言目录建出来，"
          "S02 只数已注册语言，因此这些目录既不报缺语也不报多余，整篇 47 语「齐备」却少了"
          "真正需要的语向。语言码必须逐目录核 LOCALES，与缺语判据是两件事。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.unknown_locales:
            emit(RULE, SEVERITY, art.slug, "未知语言目录: %s" % lg)


def review(finding, view):
    return finding
