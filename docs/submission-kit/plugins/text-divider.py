# -*- coding: utf-8 -*-
"""B03：正文禁止 --- 分隔线

`---` 在 mdx 里可能被当成 frontmatter 分隔符，且在站点样式下与章节标题重复。
"""
import re

RULE = "B03"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "正文里的 `\n---\n` 离 frontmatter 收尾很近时会被 gray-matter 误认成文档分隔符，导致后半篇不渲染；站点样式也没有分割线设计，属纯噪音。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(body.split("\n"), 1):
                if re.match(r"^\s*---+\s*$", ln):
                    emit(RULE, SEVERITY, tag,
                         "第 %d 行出现 --- 分隔线（正文禁止）" % i)

def review(finding, view):
    return finding
