# -*- coding: utf-8 -*-
"""S01：顶层只允许 blog/ 与 regulation/ 两个目录；articles/ 旧布局已停止支持。

三种红面：
  1. 顶层出现其它目录/裸文件 → 「顶层只有 blog/ 与 regulation/ 两个目录，发现: X」
  2. 出现 articles/ 旧布局 → 一次汇总报（不逐个文件刷屏）
  3. 整包没有任何 blog/<slug>/ 或 regulation/<slug>/ → 「压缩包内没有…结构」
"""

RULE = "S01"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["layout"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package']}

RATIONALE = {
    RULE: "v1.63 硬切换实测：站点侧只认 blog/ 与 regulation/ 两个顶层目录，"
          "此前 articles/ 混排布局仍在包内流通，官方检查照收，投稿被退回才暴露。"
          "旧布局按「整包一次汇总」报条数而非逐文件报，是因为 2026-10 一次演练中"
          "articles/ 里有 51 个文件，逐条刷屏把真正的结构性 red 淹掉了。",
}


def run(view, emit):
    tops, stray, legacy, _junk = view.layout
    for n in stray:
        emit(RULE, SEVERITY, "-",
             "顶层只有 blog/ 与 regulation/ 两个目录，发现: %s" % n)
    if legacy:
        emit(RULE, SEVERITY, "-",
             "包内出现旧的 articles/ 布局（%d 个文件）—— 已停止支持。"
             "请改为 blog/<slug>/ 与 regulation/<slug>/，按 kind 分目录" % legacy)
    if not view.articles:
        emit(RULE, SEVERITY, "-",
             "压缩包内没有 blog/<slug>/ 或 regulation/<slug>/ 结构")


def review(finding, view):
    return finding
