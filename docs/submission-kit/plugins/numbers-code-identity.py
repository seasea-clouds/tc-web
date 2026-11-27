# -*- coding: utf-8 -*-
"""P36：标识型数字（监管代码 / 税号 / 文号 / 限值）逐块存活

母版块里的编码与 ≥3 位数字必须原样出现在各语同一块。P 族只管结构、L 族只管
全篇相似度，「结构全对、把 1210 写成 1021」此前无人拦。

四档：缺号 error；与母版近形（等长差一位 / 差一个数量级）的「多出」error；
母版该块有数字时其余多出按 warning（可能是译者补的年份/汇率）；
母版该块**无**数字时，官方全文块（marker 之后）多出「母版全篇存在的 3 位纯数字」
按 warning（官方措辞不得增删，多为补锚时误做全文替换所致）。
3 位纯数字 + 母版全篇存在 = 公告号/代码/条款号类标识，多插必是事故；
年份（4 位）、中文「万/亿」展开值（≥5 位）、小数（含点）均不在射程，避免本地化误报。
"""
import re

from core.textutil import _block_kind, _near_num, cn_number_to_int, id_numbers, wan_face_groups
from core.consts import _CN_ORD_RE, ORIGINAL_MARKER

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
                    "二十四条之一）折叠进缺号面，译文写 224 不再被记成杜撰。"
                    "v2.16（REG245 ja/ko 实证）：母版块无数字时原判据整块跳过，"
                    "译语在官方全文块多插数字无人拦——ja/ko 首段与议定书条、"
                    "附加声明括注共 4 处被误插「公告第 244 号」（补数字锚时误做全文"
                    "替换，污染官方措辞），机检全绿、靠逐语直读才发现。现补"
                    "「官方块（marker 后）母版该块无数字而译语多出标识型数字」"
                    "warning 一支。射程收窄为「3 位纯数字 + 母版全篇存在」，"
                    "排除年份/万·亿展开值/小数：全库 164 条法规探针零命中，"
                    "不误伤存量；注入 244 必报。解读段不在射程（允许带文号），"
                    "blog 无 marker 不适用。",
}


def _mask_links(text):
    return re.sub(r"\]\([^)]*\)", "]", text)


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        mblocks = art.blocks(ml)
        src = [_mask_links(x) for x in mblocks]
        try:
            mi = mblocks.index(ORIGINAL_MARKER)     # 官方全文起点；blog 无 marker
        except ValueError:
            mi = -1
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
                    # v2.16：母版该块无数字 → 原判据整块跳过。官方全文块多出
                    # 「母版全篇存在的 3 位纯数字」＝把别处的公告号/代码误插本块
                    # （补锚全文替换所致），按 warning 报。年份/万·亿展开值/
                    # 小数不在射程，避免本地化误报。
                    if mi >= 0 and bi > mi:
                        extra3 = sorted(v for v in id_numbers(_mask_links(blk))
                                        if len(v) == 3 and v.isdigit() and v in known)
                        if extra3:
                            emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                                 "第%d块（官方全文）多出母版该块没有的标识型数字 %s"
                                 "（官方措辞不得增删，疑为补锚时误插）"
                                 % (bi + 1, " / ".join(extra3[:5])))
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
