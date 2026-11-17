# -*- coding: utf-8 -*-
"""S13：条目 slug 必须小写 kebab-case，且至少 3 字符。

判定口径与历史逐字一致：只查形状与最短长度；长度上限不判（现网已有
3 篇已交付条目 slug > 60，SPEC 只是建议值，给它挂 warning 只会给绿面添噪声）。
"""
from core.consts import SLUG_RE

RULE = "S13"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["articles"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package', 'images']}

RATIONALE = {
    RULE: "v2.13 实测（C1 归档前演练）：SPEC 里的 slug 形状此前只有常量没有调用，"
          "把 submission.json/B01 的 slug 改成大写单字符仍 PASS——形状判据形同虚设。"
          "修法是在条目入口无条件执行 SLUG_RE + 最短 3 字符；上限不判，因为"
          "submission/blogs/ 下已有 3 条已交付条目 slug 超过 60 字符，加判会误伤成品。",
}


def run(view, emit):
    for art in view.articles:
        slug = art.slug
        if not SLUG_RE.match(slug) or len(slug) < 3:
            emit(RULE, SEVERITY, slug,
                 "slug 必须是小写 kebab-case 且至少 3 字符（当前 %r）" % slug)


def review(finding, view):
    return finding
