# -*- coding: utf-8 -*-
"""P56：正文不得出现非本语言文字系统的字母（串稿/复制残留）

码位级兜底：某语文件里混进另一语系的字母，多为串稿或复制粘贴残留。法规线
error（译本出现非本语字母即为事故）；博客线 warning（英文稿引中文原词是合法写法）。
"""
from plugins._health import _p56_message, _p56_wrong_script_hits

RULE = "P56"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.72 立规、v1.75 分档：法规 192 份 + 博客 480 份 mdx 全部登记在 "
                    "P56_LANG_SCRIPTS 表，升档前实测现存命中 0 处（正对照：he 稿注入"
                    "阿拉伯字母 الحصري 后照出 6 处）。法规升 error——译本出现非本语字母"
                    "就是串稿事故，没有「作者故意为之」的豁免；博客留 warning——英文稿"
                    "引中文原词（品牌名、公告标题）是合法写法，不能由这条锁死。",
}


def run(view, emit):
    for art in view.articles:
        sev = "error" if art.is_reg else "warning"
        for lg in sorted(art.parsed):
            hits = _p56_wrong_script_hits(art.body(lg) or "", lg)
            if hits:
                emit(RULE, sev, "%s/%s" % (lg, art.slug),
                     "正文出现非本语言文字系统的字母（疑似串稿/复制残留）: "
                     + _p56_message(hits))


def review(finding, view):
    return finding
