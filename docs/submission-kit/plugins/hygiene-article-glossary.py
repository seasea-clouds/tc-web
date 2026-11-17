# -*- coding: utf-8 -*-
"""P46：文章级术语表已废止

包里出现 pipeline/glossary*.json 一类文章级词形表即提示合并进术语库——同一份
契约分放两处，改一处漏一处（F3 r2 实证）。
"""
RULE = "P46"
RULES = [RULE]
PHASE = 40
CATEGORY = "hygiene"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["files"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "any", "zones": ['package']}

RATIONALE = {
    RULE: "v1.52 立规（F3 r2 实证）：某篇在 pipeline/glossary.json 里放了一份"
                    "文章级词形表，与术语库里的同名条目各改各的，正文按旧词形译完、"
                    "术语库已是新词形，两处对不上。词形契约必须单一来源（data/glossary.db），"
                    "文章级词表只能提示合并后删除。档位 warning：文件存在不影响文本，"
                    "但它是「双份契约」的信号，必须报出来提醒合并。",
}


def run(view, emit):
    for art in view.articles:
        for tail in sorted(art.files):
            low = tail.replace("\\", "/").lower()
            if "pipeline" in low and "glossar" in low:
                emit(RULE, SEVERITY, art.slug,
                     "发现文章级术语表 %s（文章级术语表已废止）：请把其中条目"
                     "合并进策略库（submit.py glossary add）"
                     "（专业术语全文章生效；标题/摘要结构契约用条款级 zh 锚"
                     "按内容绑定），然后删除该文件" % tail)
                break


def review(finding, view):
    return finding
