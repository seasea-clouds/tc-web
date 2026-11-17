# -*- coding: utf-8 -*-
"""B01：正文使用一级标题 # （必须从 ## 起）

站点渲染时 # 会被当成页面标题，与文章标题打架、SEO 结构错乱。
"""
import re

RULE = "B01"
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
    RULE: "站方正文容器自带 h1，作者再写 `# 标题` 会在同页出现两个一级标题；A1/D4 等已交付篇目的正文层级都是从 ## 起，属全系列硬结构约定，标题层级错了会连带影响站内自动目录的生成。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            for i, ln in enumerate(body.split("\n"), 1):
                if re.match(r"^#\s", ln):
                    emit(RULE, SEVERITY, tag,
                         "第 %d 行使用了一级标题 #，请用 ##" % i)

def review(finding, view):
    return finding
