# -*- coding: utf-8 -*-
"""R16：法规题录不得写 date 字段（只保留 publishedAt 与 effectiveAt）

date 与 publishedAt 语义重复，是「日期对不上」的根源：改稿时改了一处漏一处，
列表页排序与详情页日期分叉。
"""
RULE = "R16"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['metadata']}

RATIONALE = {
    RULE: "v1.65→v1.66 演进：v1.65 只能靠 R23 事后比对 date 与 publishedAt 是否"
                    "一致，改稿人得先写错再改对，来回两轮；v1.66 直接在字段层禁写 ——"
                    "法规只保留 publishedAt（发布日）与 effectiveAt（施行日），写 date "
                    "就报错。存量法规包按此清过一遍，其中两篇 date 与 publishedAt 相差"
                    "一天（发布日期 vs 上网日期），正是本条要防的分叉。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg or art.meta_state not in ("ok", "empty"):
            continue
        if str(art.meta.get("date") or "").strip():
            emit(RULE, SEVERITY, art.slug,
                 "法规不要写 date 字段 —— 只保留 publishedAt（法规发布日）与 "
                 "effectiveAt（施行日）两个日期（当前 date=%r）" % art.meta.get("date"))


def review(finding, view):
    return finding
