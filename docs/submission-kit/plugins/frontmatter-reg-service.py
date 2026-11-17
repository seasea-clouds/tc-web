# -*- coding: utf-8 -*-
"""R19：法规 relatedService 必须是站内真实服务页（题录 + 逐语 frontmatter）

指向不存在的服务页会 404，法规页底部的「相关服务」入口就成了死链。
"""
from core.consts import REG_SERVICES

RULE = "R19"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["meta", "parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['metadata', 'frontmatter']}

RATIONALE = {
    RULE: "v1.58 实测：某篇法规 relatedService 写成 \"import-clearance\"（站内没有"
                    "这个路径，真实路径是 \"customs-clearance\"），法规详情页底部的"
                    "「相关服务」按钮点进去 404，读者以为文章下架。REG_SERVICES 是"
                    "站内服务页的单一来源，另一臂在逐语 frontmatter 的 related_service，"
                    "两处都要判——只改题录时页面底栏仍指向旧路径。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        if art.meta_state in ("ok", "empty"):
            svc = str(art.meta.get("relatedService") or "").strip()
            if svc and svc not in REG_SERVICES:
                emit(RULE, SEVERITY, art.slug,
                     "relatedService 必须是 %s 之一（当前 %r）—— 指向不存在的服务页"
                     "会 404" % (" / ".join(REG_SERVICES), svc))
        for lg in sorted(art.parsed):
            fv = str((art.fm(lg) or {}).get("related_service") or "").strip()
            if fv and fv not in REG_SERVICES:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "related_service 必须是 %s 之一（当前 %r）"
                     % (" / ".join(REG_SERVICES), fv))


def review(finding, view):
    return finding
