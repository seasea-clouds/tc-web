# -*- coding: utf-8 -*-
"""M13：sourceUrl 必须是无空白 http(s) URL

只判形状，不判可达性（可达性属人工核验）。
"""
import re

RULE = "M13"
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
    RULE: "v1.36 实测：sourceUrl 里带了换行与中文全角空格，站方渲染成断链（href 里混入"
          "\\u3000 与 \\n），点开 404；另有一次写成 `www.customs.gov.cn/...` 少了协议头，"
          "站方按相对路径拼成站内地址。空值合法（部分文章无外部原文），因此只判非空时的形状，"
          "不判可达性——可达性属人工核验，机检连不上外网时会给假红。",
}


def run(view, emit):
    for art in view.articles:
        if art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        su = str(meta.get("sourceUrl") or "").strip()
        if su and not re.match(r"^https?://[^\s]+$", su):
            emit(RULE, SEVERITY, art.slug,
                 "sourceUrl 必须是无空白的 http(s) URL（当前 %r）" % su)


def review(finding, view):
    return finding
