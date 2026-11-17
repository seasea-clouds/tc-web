# -*- coding: utf-8 -*-
"""F02：frontmatter 字段集合恰好等于白名单

缺字段、多字段分两条报。法规多一个 related_service 合法字段。
"""
from core.consts import (FRONTMATTER_KEYS, FRONTMATTER_KEYS_REG,
                         FRONTMATTER_REQUIRED_REG)

RULE = "F02"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.15 实测：某语多写了 `cover:` 字段（旧模板残留），站方 gray-matter"
                    "把它当正文数据透传，页面里多出一行裸文本；另一语把 references 写坏后"
                    "整字段消失，只报「少了 1 条参考」看不出是字段没了。"
                    "缺/多两侧分别报，因为修复动作不同（补字段 vs 删字段）。",
}


def run(view, emit):
    for art in view.articles:
        keys = FRONTMATTER_KEYS_REG if art.is_reg else FRONTMATTER_KEYS
        required = FRONTMATTER_REQUIRED_REG if art.is_reg else FRONTMATTER_KEYS
        for lg in art.langs:
            fm = art.fm(lg)
            missing = [k for k in required if k not in fm]
            if missing:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter 缺字段: %s" % ", ".join(missing))
            extra = [k for k in fm if k not in keys]
            if extra:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter 多出字段: %s（只允许 %s）"
                     % (", ".join(extra), ", ".join(keys)))


def review(finding, view):
    return finding
