# -*- coding: utf-8 -*-
"""R13：法规 submission.json 必填字段齐备

法规题录比博客多文号、发布机构、发布/施行日期、状态等字段；缺一项，站方法规
列表页与详情页的对应栏位就空着。
"""
from core.consts import SUB_REQUIRED_REG

RULE = "R13"
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
    RULE: "v1.57 建立法规线时实测：按博客题录起手的法规包缺 docNumber / issuer / "
                    "publishedAt / effectiveAt / status 五个字段，站方渲染出的法规页"
                    "「文号」「发布机构」「施行日期」三栏全部空着，读者无法判断公告"
                    "是否现行有效。字段清单是 SUB_REQUIRED_REG 单一来源，博客有 date、"
                    "法规改为 publishedAt + effectiveAt，因此清单按 kind 分两套，"
                    "本条只判法规那一套。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg or art.meta_state not in ("ok", "empty"):
            continue
        for req in SUB_REQUIRED_REG:
            if req not in art.meta:
                emit(RULE, SEVERITY, art.slug,
                     "法规 submission.json 缺字段 %s" % req)


def review(finding, view):
    return finding
