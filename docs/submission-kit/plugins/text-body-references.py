# -*- coding: utf-8 -*-
"""B04：References 章节必须放 frontmatter

正文里写 References 会与站方文末渲染的参考文献重复，且不参与引用样式。
"""
import re

RULE = "B04"
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
    RULE: "站方按 frontmatter 的 references 渲染文末引用块；正文再写一个`## References` 会重复出现两次，第二份还是纯文本、不可点击。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            if re.search(r"(?im)^#{2,3}\s*references\b", body):
                emit(RULE, SEVERITY, tag,
                     "正文出现 References 章节（请移到 frontmatter）")

def review(finding, view):
    return finding
