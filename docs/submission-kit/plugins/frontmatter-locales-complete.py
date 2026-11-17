# -*- coding: utf-8 -*-
"""M07：locales 必须正好是 48 个注册语言

缺哪个、多哪个都点名。题录 locales 与 content/ 目录是两套声明，
本条只判题录这一侧（目录侧归 S02）。
"""
from core.consts import LOCALES

RULE = "M07"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata', 'package']}

RATIONALE = {
    RULE: "v1.30 实测：题录 locales 少写 `ti`，包内 mdx 齐全——站方按 locales "
                    "决定发哪些语向，结果 47 语只发了 46 篇。缺/多两侧分别列出，"
                    "是因为「少一个」是漏写、「多一个」是删错，修复动作不同。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        locs = meta.get("locales")
        if not isinstance(locs, list) or any(not isinstance(x, str) for x in locs):
            emit(RULE, SEVERITY, art.slug,
                 "locales 必须是字符串数组（当前 %s）" % type(locs).__name__)
        elif sorted(locs) != sorted(LOCALES):
            missing = sorted(set(LOCALES) - set(locs))
            extra = sorted(set(locs) - set(LOCALES))
            emit(RULE, SEVERITY, art.slug,
                 "locales 必须正好 48 个；缺: %s；多: %s"
                 % (missing or "无", extra or "无"))


def review(finding, view):
    return finding
