# -*- coding: utf-8 -*-
"""R11：<!-- original --> 只能出现一次，且前后两段都不能为空

出现多次＝解读与全文被切成多块，渲染顺序不可预期；前空＝没有解读；后空＝
没有全文译本。
"""
from core.consts import ORIGINAL_MARKER

RULE = "R11"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.57 实测三种坏形：① 同一篇出现两个标记（解读｜全文｜追加解读），"
                    "站点按第一个标记切分，后面的内容全被当成全文渲染成小字；"
                    "② 摘要在标记前但正文全在标记后，解读段实为空，页面只剩条文、"
                    "没有「这篇讲了什么」；③ 标记后只有落款，全文译本为空——三例都"
                    "在已提交稿里出现过，因此单独成条，不等 R10 兜底（R10 只判「有没有"
                    "标记」，判不了「标记得对不对」）。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            cnt = body.count(ORIGINAL_MARKER)
            if cnt == 0:
                continue                       # R10 管缺失
            if cnt > 1:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "%s 出现 %d 次（只能出现一次）" % (ORIGINAL_MARKER, cnt))
                continue
            head, tail = body.split(ORIGINAL_MARKER, 1)
            if not head.strip():
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "%s 之前的「解读」段为空" % ORIGINAL_MARKER)
            if not tail.strip():
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "%s 之后的「全文译本」段为空" % ORIGINAL_MARKER)


def review(finding, view):
    return finding
