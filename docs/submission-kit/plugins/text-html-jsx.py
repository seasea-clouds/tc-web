# -*- coding: utf-8 -*-
"""B05：正文禁止 HTML / JSX 标签与表达式

站点只渲染 markdown 与白名单组件，裸标签会原样显示或直接报错。
"""
import re

RULE = "B05"
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
    RULE: "mdx 会把 `{...}` 当表达式求值、把未知标签当组件导入，结果是整页构建失败或显示尖括号原文；站点白名单只放行图片与表格，其余 HTML 一律原样输出，作者在预览里看到的是 `&lt;div&gt;`。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            if re.search(r"</?[A-Za-z][A-Za-z0-9]*(\s[^>]*)?>", body):
                emit(RULE, SEVERITY, tag, "正文含 HTML/JSX 标签")
            if re.search(r"\{[^}\n]{0,60}\}", body):
                emit(RULE, SEVERITY, tag, "正文含 JSX 表达式 {...}")

def review(finding, view):
    return finding
