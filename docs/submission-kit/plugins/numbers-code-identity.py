# -*- coding: utf-8 -*-
"""P36：标识型数字（监管代码 / 税号 / 文号 / 限值）逐块存活

母版块里的编码与 ≥3 位数字必须原样出现在各语同一块。P 族只管结构、L 族只管
全篇相似度，「结构全对、把 1210 写成 1021」此前无人拦。

三档：缺号 error；与母版近形（等长差一位 / 差一个数量级）的「多出」error；
其余多出按 warning（可能是译者补的年份/汇率）。
"""
import re

from core.textutil import _block_kind, _near_num, cn_number_to_int, id_numbers, wan_face_groups
from core.consts import _CN_ORD_RE

RULE = "P36"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.23 起在监管代码篇目上实测：母版「1210 保税电商」「9610 直购」"
                    "在各语块里被写成 1021 / 9601，块结构、条目数、标记全对，"
                    "P21–P29 一条不出声；这类数字一旦错位，读者按错代码报关。"
                    "v1.48 补「N 万」同义面分组（整值/千位读法），否则 47 语全红；"
                    "v1.52 补近形分级（1476↔1477 升 error），把「同块两处同数改一"
                    "漏一」从 warning 噪声里拔出来。v2.15 把母版中文字数词（第二百"
                    "二十四条之一）折叠进缺号面，译文写 224 不再被记成杜撰。",
}


def _mask_links(text):
    return re.sub(r"\]\([^)]*\)", "]", text)


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        src = [_mask_links(x) for x in art.blocks(ml)]
        base = [id_numbers(x) for x in src]
        cn = []
        for x in src:
            fold = set()
            for m in _CN_ORD_RE.finditer(x):
                v = cn_number_to_int(m.group(1))
                if v is not None and v >= 100:
                    fold.add(str(v))
            cn.append(fold)
        known = set().union(*base) if base else set()
        if any(cn):
            known |= set().union(*cn)
        wan = [wan_face_groups(x) for x in src]
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            for bi, blk in enumerate(art.blocks(lg)):
                if bi >= len(base) or _block_kind(blk) in ("TABLE", "CODE", "IMG"):
                    continue
                want = base[bi] | cn[bi]
                if not want:
                    continue
                got = id_numbers(_mask_links(blk))
                miss = sorted(v for v in want - got
                              if not any(v in g and (g & got) for g in wan[bi]))
                extra = sorted(got - want)
                near = [e for e in extra
                        if any(_near_num(e, w) for w in want)]
                if miss:
                    emit(RULE, "error", "%s/%s" % (lg, art.slug),
                         "第%d块缺少母版中的编号/代码 %s（块内实际：%s）"
                         % (bi + 1, " / ".join(miss[:5]),
                            " / ".join(sorted(got)[:6]) or "无"))
                if near:
                    emit(RULE, "error", "%s/%s" % (lg, art.slug),
                         "第%d块多出与母版数字近形的 %s（疑为错写/漏改一处，逐字核对）"
                         % (bi + 1, " / ".join(near[:5])))
                other = [e for e in extra if e not in near and e not in known]
                if other:
                    emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                         "第%d块多出母版没有的数字 %s（可能是译者补的年份/汇率，需确认）"
                         % (bi + 1, " / ".join(other[:5])))


def review(finding, view):
    return finding
