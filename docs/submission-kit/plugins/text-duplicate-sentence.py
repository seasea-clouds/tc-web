# -*- coding: utf-8 -*-
"""P17：不出现连续重复句

同一句连写两遍是拼接事故（分批生成时把上一批的最后一段又写了一遍）。
"""
import re

from core.consts import DUP_SENT_SPLIT_RE

RULE = "P17"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "批量生成按「上一批结尾续写」时最容易把最后一句重复一次；句子长度门槛 40 字符是为了避开短句的修辞重复（如强调句），只抓整句级别的复制粘贴。与 P05 同族：都指向「分段拼接」这一类事故。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            sents = [s.strip() for s in DUP_SENT_SPLIT_RE.split(bare)
                     if len(s.strip()) > 40]
            for a, b in zip(sents, sents[1:]):
                if a == b:
                    emit(RULE, SEVERITY, tag,
                         "出现连续重复句: %r" % a[:60])
                    break

def review(finding, view):
    return finding
