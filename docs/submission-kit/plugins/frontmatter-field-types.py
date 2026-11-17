# -*- coding: utf-8 -*-
"""M12：submission.json 顶层与字段类型校验

五种形状：顶层不是 object、空对象、字符串字段非字符串、locales 类型、
images 类型。类型错误会让后续判据抛异常，必须先拦在入口。
"""

RULE = "M12"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["meta"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'metadata']}

RATIONALE = {
    RULE: "v1.30 实测：顶层写成数组时后续排序抛 AttributeError，整轮检查崩在"
                    "unhandled exception；空对象则绕过全部必填校验（旧版 `if meta:` 的漏洞）。"
                    "类型错误单独成条而不是并入 M02，是因为修复动作是「改结构」而非「补字段」。",
}


def run(view, emit):
    for art in view.articles:
        st = art.meta_state
        if st == "not_object":
            emit(RULE, SEVERITY, art.slug,
                 "submission.json 顶层必须是 object（当前 %s）" % (art.meta_error or "?"))
            continue
        if st == "empty":
            emit(RULE, SEVERITY, art.slug,
                 "submission.json 是空对象：全部必填字段缺失，不得判为通过")
        if st not in ("ok", "empty"):
            continue
        meta = art.meta
        for k in ("kind", "slug", "title", "category", "author", "excerpt",
                  "imageRights"):
            v = meta.get(k)
            if not isinstance(v, str) or not v.strip():
                emit(RULE, SEVERITY, art.slug,
                     "submission.json 字段 %s 必须是非空字符串（当前 %r）" % (k, v))
        locs = meta.get("locales")
        if not isinstance(locs, list) or any(not isinstance(x, str) for x in locs):
            emit(RULE, SEVERITY, art.slug,
                 "locales 必须是字符串数组（当前 %s）" % type(locs).__name__)
        imgs = meta.get("images")
        if not isinstance(imgs, list) or any(not isinstance(x, str) for x in imgs):
            emit(RULE, SEVERITY, art.slug,
                 "images 必须是字符串数组（当前 %s）" % type(imgs).__name__)


def review(finding, view):
    return finding
