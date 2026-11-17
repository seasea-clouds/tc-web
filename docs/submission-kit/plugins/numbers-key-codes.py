# -*- coding: utf-8 -*-
"""P20：裁定号与 HS 编码各语齐全

从母版抽 `X####-##`（裁定号）与 `####.####`（HS 编码），各语不得丢失。
"""
import re


RULE = "P20"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "这两类编码是法规与商品归类的事实锚点，读者要拿它去报关或核对公告；译文把它们「意译」掉或删掉，读者就无法据此办事。P04 会排除字母相邻的编码，所以需要这条兜底。",
}



def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        codes = sorted(set(re.findall(
            r"\b[A-Z]\d{4}-\d{2}\b|\b\d{4}\.\d{4}\b", art.body(ml))))
        if not codes:
            continue
        for lg in art.langs:
            if lg == ml:
                continue
            miss = [c for c in codes if c not in art.body(lg)]
            if miss:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "关键代码缺失: %s" % miss)

def review(finding, view):
    return finding
