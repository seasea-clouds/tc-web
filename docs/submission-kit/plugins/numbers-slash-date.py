# -*- coding: utf-8 -*-
"""P93：裸斜杠数字日期（三段式，月日歧义）

完整日期不得写成 29/1/2026 一类三段斜杠形——月日歧义（2/9 是 2 月 9 日还是
9 月 2 日），各语硬约定要求用本语月份名完整日期形（29 January 2026 /
29 tháng 1 năm 2026）。两段式（29/1）可能是分数、比例，不判；只收三段
D/M/YYYY、D/M/YY 或 Y/M/D，全角斜杠 ／ 同收。
"""
import re

from core.textutil import blocks as _blocks

RULE = "P93"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.24 立规（REG228 实证，reg-writer-main）：vi 解读块1 写成"
                    "`Ngày 29/1/2026`——三段斜杠日期月日歧义，机检当时只靠 P36 数字"
                    "存活间接兜底（warning 且指向不明），人工逐语直读才抓出。全库"
                    "探针（8372 文件）301 处命中、分布在 12 篇历史交付稿（最大单篇"
                    "143），属存量形态按不追溯铁律不回头改——故立 warning 供编写者"
                    "逐条裁定与未来收敛，不阻塞存量 PASS；新稿在任务书明确禁令后"
                    "零命中（REG231 47 语实证）。两段式（29/1）可能是分数/比例不判；"
                    "链接 [...] (...) 先剥离防 URL 路径段误报。",
}

SLASH_DATE_RE = re.compile(
    r"\b(?:\d{1,2}\s*[/\uFF0F]\s*\d{1,2}\s*[/\uFF0F]\s*\d{2,4}"
    r"|\d{4}\s*[/\uFF0F]\s*\d{1,2}\s*[/\uFF0F]\s*\d{1,2})\b")

_LINKS_RE = re.compile(r"\]\([^)]*\)")


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = _LINKS_RE.sub("]", art.body(lg) or "")
            for bi, blk in enumerate(_blocks(body)):
                m = SLASH_DATE_RE.search(blk)
                if m:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块出现裸斜杠数字日期 %s（月日歧义；应写本语月份名"
                         "完整日期形，如 29 January 2026）" % (bi + 1, m.group(0)))


def review(finding, view):
    return finding
