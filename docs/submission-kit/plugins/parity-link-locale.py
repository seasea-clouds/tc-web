# -*- coding: utf-8 -*-
"""P29：正文链接的语言前缀必须是本文自己的语言

站内链接写成 /<lang>/...；语言前缀与本文语向不符时，读者点进去被带到另一种
语言。语言前缀由 P27 归一化后不比，所以必须单列一条判。
"""
import re

from core.textutil import _inline_links

RULE = "P29"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "自 v1.22 起实测：西语版 CTA 写成 /zh/packages/（从中文母版直接抄了"
                    "前缀），读者点击后被带到中文页面；批量回填时同一篇的 7 个语向"
                    "同时错。P27 把语言前缀归一成 /<lang> 后比路径，前缀错误在那里"
                    "是「一致」的，只有本条能抓。只认两字母前缀：/zh-hans/ 这类"
                    "长码由 locale 白名单在 structure-locale-known 侧拦，不在此重复。",
}

_LANG_PREFIX_RE = re.compile(r"^/([a-z]{2})(/|$)")


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            for tgt in _inline_links(art.body(lg) or ""):
                m = _LANG_PREFIX_RE.match(tgt)
                if not m:
                    continue
                if m.group(1) != lg:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "链接指向了其他语言: %s（本文语言为 %s）" % (tgt, lg))


def review(finding, view):
    return finding
