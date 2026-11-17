# -*- coding: utf-8 -*-
"""P50：CTA 末行必须有终止标点（博客线；法规整类不判）

末块是给读者落地的一步，句号缺失在页面上表现为「句子没写完」。泰文没有句点
惯例，整语向豁免；法规以落款日期收尾，日期行天生不带标点，整类停判。
"""
from core.consts import P50_NO_TERM_LANGS, P50_TERMINAL

RULE = "P50"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.55 实测（M1 47 语审校第三批）：th/he/fa/af/ca/sw/bn/ta/vi/nl/tr/it/ur "
                    "十四语末行缺终止标点（bn 用 ।、hy 用 ։、ur 用 ۔、he 用 。，其余用 .），"
                    "读者看到最后一句没有句号，以为内容被截断。th 整语向豁免（泰文无句点"
                    "惯例，六篇一致缺）。v1.69 法规整类停判：公告以落款日期收尾，补句号"
                    "反而是改动官方文本的呈现。",
}

def run(view, emit):
    for art in view.articles:
        if art.is_reg:
            continue
        for lg in sorted(art.parsed):
            if lg in P50_NO_TERM_LANGS:
                continue
            tail = [x.strip() for x in (art.body(lg) or "").split("\n")
                    if x.strip() and not x.lstrip().startswith("#")]
            if not tail:
                continue
            last = tail[-1].rstrip()
            if last and last[-1] not in P50_TERMINAL:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "末行结尾缺终止标点（当前收尾 %r，应加 %s 之一）"
                     % (last[-24:], "/".join(P50_TERMINAL[:6])))


def review(finding, view):
    return finding
