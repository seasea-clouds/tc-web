# -*- coding: utf-8 -*-
"""M04：日期字段必须是真实日期且在绝对区间内

博客判 date；法规判 publishedAt 与 effectiveAt。区间固定为
2000-01-01..2100-12-31，不依赖当前时间（可复现）。
"""
from core.textutil import _valid_iso_date as valid_iso_date

RULE = "M04"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata']}

RATIONALE = {
    RULE: "v1.33 实测：曾用 datetime.now() 判「不得晚于今天」，导致同一包在跨日"
                    "零点前后结论不同（可复现性失效）；另有 2026-13-45 这种不存在的日期"
                    "被 strptime 之外的写法放过。改绝对区间 + 真实日历校验后两问题同时消失。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        keys = ["publishedAt", "effectiveAt"] if art.is_reg else ["date"]
        for k in keys:
            v = str(meta.get(k, "") or "").strip()
            if not v:
                if art.is_reg:
                    emit(RULE, SEVERITY, art.slug,
                         "%s 必填且应为 YYYY-MM-DD" % k)
                else:
                    emit(RULE, SEVERITY, art.slug, "date 应为 YYYY-MM-DD")
            elif not valid_iso_date(v):
                emit(RULE, SEVERITY, art.slug,
                     "%s 不是合法日期或超出 2000-01-01..2100-12-31（当前 %r）"
                     % (k, v))


def review(finding, view):
    return finding
