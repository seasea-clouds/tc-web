# -*- coding: utf-8 -*-
"""P22：正文块顺序与配图位置必须与母版一致

比对段落/列表/图片/表格的类型序列，图片按文件名比对（互换也算错位）。
"""
import re

from core.consts import IMG_REF_RE
from core.textutil import block_signature

RULE = "P22"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.72 实测：某语把「先列表、后配图」的顺序反过来，讲解节奏与其余 46 语相反；"
                    "另一语 fig-01 与 fig-02 位置互换，图注与图像对不上。图片必须比文件名"
                    "而不是只比类型——只比类型时两张图互换完全无感。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        img_re = IMG_REF_RE % re.escape(art.slug)
        base_sig = block_signature(art.master_body)
        base_fig = tuple(re.findall(img_re, art.master_body))
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            body = art.body(lg)
            cur_sig = block_signature(body)
            cur_fig = tuple(re.findall(img_re, body))
            if cur_sig == base_sig and cur_fig == base_fig:
                continue
            tag = "%s/%s" % (lg, art.slug)
            if cur_fig != base_fig and cur_sig == base_sig:
                emit(RULE, SEVERITY, tag,
                     "配图位置与 %s 不一致（%s vs %s）"
                     % (ml, list(base_fig), list(cur_fig)))
                continue
            i = next((k for k, (a, b) in enumerate(zip(base_sig, cur_sig))
                      if a != b), min(len(base_sig), len(cur_sig)))
            emit(RULE, SEVERITY, tag,
                 "正文块顺序与 %s 不一致（第%d块起：%s vs %s）"
                 % (ml, i + 1,
                    base_sig[i] if i < len(base_sig) else "-",
                    cur_sig[i] if i < len(cur_sig) else "-"))


def review(finding, view):
    return finding
