# -*- coding: utf-8 -*-
"""M01：submission.json 必须存在且是合法 JSON

条目根缺 submission.json，或内容不是合法 JSON —— 站方读不到题录，
整篇不会出现在列表页。
"""

RULE = "M01"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata', 'package']}

RATIONALE = {
    RULE: "v1.30 实测：某条目把 submission.json 写成 `submission.json.bak` 后提交，"
                    "包内全部 mdx 正常，官方 checker 只报「文件缺失」，作者以为是临时故障。"
                    "JSON 语法错误（尾逗号、裸 `:`）也归本条：题录解析失败与文件缺失，"
                    "修复动作都是补题录，合并成一条减少误判方向。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state == "missing":
            emit(RULE, SEVERITY, art.slug, "缺少 submission.json")
        elif art.meta_state == "bad_json":
            kind, val = art.meta_error or ("json", "")
            if kind == "json":
                emit(RULE, SEVERITY, art.slug,
                     "submission.json 不是合法 JSON: %s" % val)


def review(finding, view):
    return finding
