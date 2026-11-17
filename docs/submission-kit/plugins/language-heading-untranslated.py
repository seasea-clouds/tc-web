# -*- coding: utf-8 -*-
"""L07：小节标题与英文完全相同（疑似未翻译）

该语 ## 二级标题与英文同名标题逐字相同即 warning。
只报警不报错：术语型标题（如产品名、机构名）本就应保留英文。
"""


RULE = "L07"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.34 实测：某语正文翻译完整，但 6 个 ## 标题原样保留英文，读者"
                    "在目录里看到的全是英文。降为 warning 而非 error 是因为"
                    "「风险披露」「Key facts」这类标题在部分语向确有保留英文的惯例，"
                    "需要人工确认，机检不应一票否决。",
}


def run(view, emit):
    for art in view.articles:
        en_heads = set(art.heads("en"))
        if not en_heads:
            continue
        for lg in art.langs:
            if lg == "en":
                continue
            same = [h for h in art.heads(lg) if h in en_heads]
            if same:
                emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                     "小节标题与英文完全相同（疑似未翻译）: %s" % same[:2])


def review(finding, view):
    return finding
