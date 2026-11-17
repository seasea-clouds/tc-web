# -*- coding: utf-8 -*-
"""S05：文件类型白名单 + 包内垃圾/隐藏文件。

三个红面（同一规则的三种形态，判定口径与历史逐字一致）：
  1. 条目内出现白名单后缀之外的文件 → 「不允许的文件类型」
  2. 包内 __MACOSX/、.DS_Store → 「压缩包内含系统垃圾文件」
  3. 包内任一层以 . 开头的隐藏文件/目录 → 「压缩包内含隐藏文件」

不合并进 S10：S10 管位置，S05 管类型；两件事同时坏时要各自出声。
"""

RULE = "S05"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["paths", "layout"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package']}

RATIONALE = {
    RULE: "v1.18 实测：macOS 打 zip 会带 __MACOSX/._xxx 与 .DS_Store，条目内还出现过"
          "临时 .bak 与 .py 脚本被一起打进包；官方检查不报，站点侧按未知文件处理。"
          "隐藏文件单独成一类红面，是因为 .git/ 一类目录被打进包时，只报「文件类型」"
          "会给出误导性修复方向（应删目录而不是改后缀）。",
}


def run(view, emit):
    # 包级：垃圾 / 隐藏
    for n in view.layout[3]:
        if n.startswith("__MACOSX/") or n.endswith("/.DS_Store") \
                or n == ".DS_Store":
            emit(RULE, SEVERITY, "-", "压缩包内含系统垃圾文件: %s" % n)
        else:
            emit(RULE, SEVERITY, "-", "压缩包内含隐藏文件: %s" % n)
    # 条目级：后缀白名单
    for art in view.articles:
        for tail in art.bad_suffix:
            emit(RULE, SEVERITY, art.slug, "不允许的文件类型: %s" % tail)


def review(finding, view):
    return finding
