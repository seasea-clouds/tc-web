# -*- coding: utf-8 -*-
"""F08：references 最多 6 条且每条有 title 与 https 链接

三个红面：条数超限、条目缺 title、url 不是 https。
"""
import re

RULE = "F08"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.15 实测：某语 references 粘了 9 条（把整页参考链接全抄进来），"
                    "文章页参考区长度超过正文；另有多条 url 写成 http://，站方按混合内容"
                    "拦截不渲染。6 条上限来自站方模板的参考区高度约束。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            refs = art.fm(lg).get("references") or []
            if len(refs) > 6:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "references 最多 6 条")
            for r in refs:
                if not r.get("title"):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "references 条目缺 title: %r" % r)
                if not re.match(r"^https://", str(r.get("url", ""))):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "references url 必须 https:// 开头: %r" % r.get("url"))


def review(finding, view):
    return finding
