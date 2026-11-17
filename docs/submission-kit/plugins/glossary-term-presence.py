# -*- coding: utf-8 -*-
"""S08：块级术语契约（中文锚命中的块，译文必须出现该语 require 词形）

以 zh 锚点在母版中的块序号定位，取各语言同一块序号的正文再判短语：
术语表因此不依赖行号，也不受翻译后句子切分差异影响（P23 已保证逐块同构）。
"""
from plugins._glossary import glossary_findings

RULE = "S08"
RULES = [RULE]
PHASE = 30
CATEGORY = "glossary"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "glossary"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "译反方向（监管↔准入、固体饮料↔即饮、不会丢↔会丢）时，语法、结构、"
          "字数、AI 腔全部正常，P 族与 ST 族一条都拦不住，只能把母版语义固化成"
          "「该块必须出现的词 / 不得出现的词」。C1/C2 审校实证：某语把「保税仓」"
          "整段译成「仓库」，块数、条目数、标记全对齐，读者看不到「保税」这层"
          "限定；旧口径靠人工逐语对读才发现。锚点必须绑具体句不绑通用概念——"
          "REG16 用泛化锚「非疫产区」误激活，逼 en/es/ru/uk 把 ISPM 10「非疫区」"
          "降成「生产点」，属「改判据不改稿」的典型。",
}


def run(view, emit):
    for rule, sev, loc, detail in glossary_findings(view):
        if rule == RULE:
            emit(rule, sev, loc, detail)


def review(finding, view):
    return finding
