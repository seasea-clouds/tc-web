# -*- coding: utf-8 -*-
"""L08：references 第 N 条标题与英文相同（须翻译）

按序号比对 references[].title 与 en 同名条目；同一语向只报首条。
"""


RULE = "L08"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'body']}

RATIONALE = {
    RULE: "v1.34 实测：references 的标题停留在英文，正文完全译好——因为写手"
                    "把 references 当成「引用信息不用翻」的元数据。站方文章页会把"
                    "它渲染成参考资料列表，非英文语向出现整段英文书目。按序号比对，"
                    "每语只报第一条，避免 3-4 条全同时刷 4 条。",
}


def run(view, emit):
    for art in view.articles:
        en_titles = [str(r.get("title") or "").strip()
                     for r in (art.en[0].get("references") or [])]
        if not en_titles:
            continue
        for lg in art.langs:
            if lg == "en":
                continue
            refs = art.fm(lg).get("references") or []
            for idx, ref in enumerate(refs):
                if idx < len(en_titles) and en_titles[idx] \
                        and str(ref.get("title") or "").strip() == en_titles[idx]:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "references 第 %d 条标题与英文相同（须翻译）" % (idx + 1))
                    break


def review(finding, view):
    return finding
