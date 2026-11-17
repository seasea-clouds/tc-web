# -*- coding: utf-8 -*-
"""M08：images 清单与实际图片文件一致

题录 images 与 images/<slug>/ 下的文件名双向比对；多一个、少一个都报。
"""

RULE = "M08"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta", "images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata']}

RATIONALE = {
    RULE: "v1.30 实测：删掉一张过时配图后忘了改题录，站方按清单装配图集，"
                    "少的那张 404、多的那张不显示；两向都要判，只判「清单里有的都存在」"
                    "会漏掉「实际有图但清单没写」这一半。法规侧另有 R12 禁配图。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        imgs = meta.get("images")
        if not isinstance(imgs, list) or any(not isinstance(x, str) for x in imgs):
            emit(RULE, SEVERITY, art.slug,
                 "images 必须是字符串数组（当前 %s）" % type(imgs).__name__)
        elif sorted(imgs) != sorted(art.images.keys()):
            emit(RULE, SEVERITY, art.slug,
                 "images 清单与实际文件不一致（清单: %s / 实际: %s）"
                 % (sorted(imgs), sorted(art.images.keys())))


def review(finding, view):
    return finding
