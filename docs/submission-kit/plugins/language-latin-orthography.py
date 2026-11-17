# -*- coding: utf-8 -*-
"""P71：拉丁变音正字法完整性（词表在 策略库 lexicons 表（latin-ascii / latin-required））

两臂互斥：词表命中的正字法缺失即报；不依赖契约库、不绑篇目锚点。
"""
from plugins._language import check_latin_orthography

RULE = "P71"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v2.24 立规（REG24 实证 + 2698 份存量零回归探针）：某语把变音符号整个省掉"
                    "（č→c、ș→s、ı→i），读者读得懂但正字法错了，且这类缺失去掉变音符"
                    "后与另一词的拼写重合，语义歧义。两臂互斥（词表命中即跳过整体臂），"
                    "条件只由语向 + 词形决定，不依赖契约库、不绑篇目锚点、无 legacy。"
                    "v345 裁决（2026-11-14 全库复审）：af 从 latin-required 移除。"
                    "v2.25 按「存量 100% 含变音」把 af 入表，但该统计来自同源机翻的"
                    "习惯性 trema，不是正字法事实——南非荷兰语只用 26 个拉丁字母，"
                    "标准文本可为纯 ASCII（分音符仅 reëel/geëerd 一类零星词形）。"
                    "误报后果是官方尺 template/regulation 的 af 样例被判红，"
                    "`check template` 由 PASS 掉到 FAIL 1e/2w。教训：存量统计只能"
                    "证伪「普遍缺失」，不能证明「必须出现」；闭类语言事实才可入表。",
}


def run(view, emit):
    def _add(rule, sev, loc, detail):
        emit(rule, sev, loc, detail)

    for art in view.articles:
        check_latin_orthography(view, art.parsed, art.slug, _add)


def review(finding, view):
    return finding
