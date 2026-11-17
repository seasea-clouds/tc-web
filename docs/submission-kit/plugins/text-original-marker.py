# -*- coding: utf-8 -*-
"""R10：法规正文必须用 <!-- original --> 分隔解读与全文译本

缺标记时页面只有解读段、不出现官方全文——读者看不到条文本身。
"""
import re

from core.consts import ORIGINAL_MARKER

RULE = "R10"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.57 建立法规线时实测：早期法规包沿用博客结构（只有解读、没有官方"
                    "全文），页面读者看不到条文，评论区反复问「原文在哪」。标记本身是"
                    "ASCII 注释，转写正文时容易被同化成 <!-- оригинал --> 一类非 ASCII "
                    "注释，因此报错时探测非 ASCII 注释并直接给出根因，避免「明明有标记"
                    "却报缺失」的迷惑。档位 warning：缺全文不是错误文本，是结构缺失，"
                    "不阻断打包但必须提示。",
}

_NON_ASCII_COMMENT_RE = re.compile(r"<!--\s*[^<>]*[^\x00-\x7F][^<>]*-->")


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            if body.count(ORIGINAL_MARKER):
                continue
            extra = ""
            m = _NON_ASCII_COMMENT_RE.search(body)
            if m:
                extra = ("；检测到含非 ASCII 字符的 HTML 注释 %r——"
                         "转写正文时 %s 标记须保持 ASCII 原样"
                         % (m.group(0)[:40], ORIGINAL_MARKER))
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "正文缺少 %s：该篇只有解读、页面不会出现全文译本%s"
                 % (ORIGINAL_MARKER, extra))


def review(finding, view):
    return finding
