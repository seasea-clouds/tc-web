# -*- coding: utf-8 -*-
"""S10：包内路径白名单 —— 只允许 submission.json、images/**.webp、content/<lang>/<slug>.mdx。

不查「目录名是否等于 slug」（那是 S04 的职责），也不查后缀是否合法（S05），
本条只回答「这个位置是否在白名单里」。
"""

RULE = "S10"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["paths"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package']}

RATIONALE = {
    RULE: "v1.22 实测：某次临时脚本把 900KB 的 _blocks.json 落在 content/ 下——"
          "它不是 mdx（S04 不管），后缀 .json 又在 S05 白名单里，于是顺利进包，"
          "官方检查 0 error，直到打包后文件数从 51 变成 52 才暴露。"
          "条目内位置白名单因此必须独立成一条判据，不能靠后缀判据兜。",
}


def _allowed(tail, slug):
    if tail == "submission.json":
        return True
    parts = tail.split("/")
    if parts[0] == "images" and 2 <= len(parts) <= 3 \
            and parts[-1].lower().endswith(".webp"):
        return True
    if parts[0] == "content" and len(parts) == 3 \
            and parts[2] == slug + ".mdx":
        return True
    return False


def run(view, emit):
    for art in view.articles:
        for tail in art.tails:
            if not _allowed(tail, art.slug):
                emit(RULE, SEVERITY, art.slug,
                     "包内多余文件（不在规定位置）: %s（只允许 submission.json、"
                     "images/**.webp、content/<lang>/%s.mdx）" % (tail, art.slug))


def review(finding, view):
    return finding
