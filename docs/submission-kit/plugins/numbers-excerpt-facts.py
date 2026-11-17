# -*- coding: utf-8 -*-
"""P55：摘要关键数字跨语言齐全

母版摘要里的份额数（69%）与规模数，各语摘要都不得丢。
"""
import re

from core.textutil import find_number, normalize_digits

RULE = "P55"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["frontmatter"]}

RATIONALE = {
    RULE: "P04 只看正文：某语摘要把「前五占 69%」整层删掉，摘要长度仍合规、正文也对，但这句承诺只在列表页消失，读者点进来才知道。M1 第四轮复审实证 11 语摘要是从英文中转稿二次压缩的，四层里只剩两三层。",
}

def extract_excerpt_facts(excerpt):
    """P55（v1.70）：摘要里的关键数字。与正文 P04 分开取：正文只收
    ≥1000 的整数与小数，摘要还要收 10–999 的份额数（如 69%），否则
    「前五 69%」整层丢了也无声。小数统一成点号，整数 ≥10 才收，避免
    把 S1/S3、篇号、列表序号当成事实。"""
    out = []
    for m in re.finditer(r"(?<![\w])(\d+(?:[.,]\d+)?)(?![\w])", excerpt):
        t = m.group(1)
        if "." in t or "," in t:
            out.append(t.replace(",", "."))
        elif int(t) >= 10:
            out.append(t)
    return sorted(set(out))

def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = str((art.fm(ml) or {}).get("excerpt") or "")
        facts = extract_excerpt_facts(base)
        if not facts:
            continue
        for lg in art.langs:
            if lg == ml:
                continue
            cur = str((art.fm(lg) or {}).get("excerpt") or "")
            nb = normalize_digits(cur)
            missing = [s for s in facts if not find_number(nb, s)]
            if missing:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "摘要关键数字缺失（对照 %s）: %s" % (ml, missing))

def review(finding, view):
    return finding
