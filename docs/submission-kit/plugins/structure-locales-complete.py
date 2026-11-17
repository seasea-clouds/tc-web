# -*- coding: utf-8 -*-
"""S02：48 语目录必须齐备

逐语点名缺哪一个；与 M07 互补（M07 判题录，本条判文件）。
"""
from core.consts import LOCALES

RULE = "S02"
RULES = [RULE]
PHASE = 20
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["mdx"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'body', 'package', 'metadata']}

RATIONALE = {
    RULE: "v1.30 实测：C1 首批只写了 12 语就打包，官方 checker 只核对题录 locales，"
                    "包内实际 12 篇，站方 36 个语向空白。文件侧必须独立点名，"
                    "因为题录侧的 M07 可以写全 48 而文件只有 12 个。"
                    "v348 聚合（2026-11-14 复审）：此前每缺一语发一条 finding，"
                    "新起手包 check 直接刷 47 行「缺少语言: xx」，结果行报 "
                    "47 error——错误计数与实际缺陷数（1 个：语未补）严重失真，"
                    "输出里也看不出这是一件事。改为每条目一条，逐语仍全部点名。",
}


def run(view, emit):
    for art in view.articles:
        missing = [lg for lg in LOCALES if lg not in art.mdx_info]
        if missing:
            emit(RULE, SEVERITY, art.slug,
                 "缺少 %d 个语言（共需 %d）：%s"
                 % (len(missing), len(LOCALES), ", ".join(missing)))


def review(finding, view):
    return finding
