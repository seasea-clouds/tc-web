# -*- coding: utf-8 -*-
"""F11：法规 frontmatter 不得残留模板占位元数据

模板 `sample-import-food-producer-registration` 自带 `doc_number: Sample Decree
No. 1` 与 `source_url: https://www.gov.cn/gongbao/example/content_0000001.html`，
起手时随 48 语一起复制。作者认真改了标题和正文、却漏改这两个字段时，其余判据
全绿——占位元数据会跟着交付包发给站方。

只判这两个字段的**字面占位形状**，不扫正文、不按泛化词形封杀 "sample"
（讲样品/样本的文章是合法内容）。
"""
import re

RULE = "F11"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点）
COVERAGE = {"langs": "all", "zones": ["frontmatter"]}

RATIONALE = {
    RULE: "全流程演练实证：start regulation 从模板生成的 48 语骨架里 doc_number "
          "= Sample Decree No. 1、source_url = .../example/content_0000001.html；"
          "补齐 48 语后 check 因语言层全绿不再点名这两项，机检通过却把占位文号/链接"
          "发给站方。只判这两个字段的字面占位形状，不扫正文——正文里的 sample "
          "可能是真实内容，按泛化词形判会成片假红。",
}

_DOC_PLACEHOLDER = re.compile(r"(?i)\bsample\b")
_URL_PLACEHOLDER = re.compile(r"(?i)/example(?:/|$)")


def run(view, emit):
    for art in view.articles:
        if art.kind != "regulation":
            continue
        for lg in art.langs:
            fm = art.fm(lg)
            doc = str(fm.get("doc_number") or "")
            if _DOC_PLACEHOLDER.search(doc):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "doc_number 仍是模板占位值：%r" % doc)
            url = str(fm.get("source_url") or "")
            if _URL_PLACEHOLDER.search(url):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "source_url 仍是模板占位链接：%r" % url)


def review(finding, view):
    return finding
