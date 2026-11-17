# -*- coding: utf-8 -*-
"""R14：法规 status 必须是固定枚举（题录 + 逐语 frontmatter）

状态决定站方在法规页顶部挂「现行有效 / 已废止」标签；写错枚举值标签不渲染。
"""
from core.consts import STATUS_ENUM

RULE = "R14"
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
    RULE: "v1.61 实测：某篇法规题录写 status: \"in force\"（英文短语），枚举里只有 "
                    "effective / superseded / draft 三个值，站方标签组件认不出，"
                    "页面顶部空白；逐语 frontmatter 也各写各的（有的写 有效、有的写 "
                    "in force）。两臂分开报：题录臂改 submission.json，逐语臂要重跑 "
                    "48 个 mdx 的 status 行，改法不同、责任人不同。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        if art.meta_state in ("ok", "empty"):
            st = str(art.meta.get("status") or "")
            if st and st not in STATUS_ENUM:
                emit(RULE, SEVERITY, art.slug,
                     "status 必须是 %s 之一（当前 %r）"
                     % (" / ".join(STATUS_ENUM), st))
        for lg in sorted(art.parsed):
            fv = str((art.fm(lg) or {}).get("status") or "").strip()
            if fv and fv not in STATUS_ENUM:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "status 必须是 %s 之一（当前 %r）"
                     % (" / ".join(STATUS_ENUM), fv))


def review(finding, view):
    return finding
