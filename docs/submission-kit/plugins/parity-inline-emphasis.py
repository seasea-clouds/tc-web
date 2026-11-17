# -*- coding: utf-8 -*-
"""P26：行内强调必须落在母版的同一位置

逐块比对加粗数 / 斜体数 / 行内代码数；列表额外比对「逐项加粗分布」——整块
总数相同但加粗从第 2 项挪到第 5 项，视觉重点就错了，总数看不出。

各块类型的「强调」维度下标不同（H2 在 1、LIST/TABLE 在 3、PARA 在 0），
必须按 _DETAIL_LABELS 动态定位，写死下标会让标题类块整块漏检。

维度名从 `core.consts` 取（`LBL_BOLD` 等），**不在这里重打字面量**：
按名字定位意味着标签字符串是跨文件的键，表里改名而这里没改，
下面的 `if lab not in labels: continue` 会让整条规则静默跳过。
"""
from core.consts import _DETAIL_LABELS
from core.consts import LBL_BOLD, LBL_CODE, LBL_ITEM_BOLD, LBL_ITALIC
from core.textutil import _block_misalign_hints, _blocks_by_kind

RULE = "P26"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master", "outline"]
SEVERITY = "error"
ENABLED = True

# 逐块比对的三个强调维度（顺序即报告顺序）
EMPHASIS_DIMS = (LBL_BOLD, LBL_ITALIC, LBL_CODE)

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "自 v1.31 起实测：中文母版把关键结论加粗，某些语向整段丢掉了星号，"
                    "读者在其他语言看到的视觉层级与母版不同；另有语向把加粗从"
                    "列表第 2 项挪到第 5 项，整块加粗数仍是 1，只比总数完全看不见。"
                    "P23 逐块大纲里「加粗数」这一维与 P26 同源，但 P23 只在整块"
                    "大纲不相等时报一句概览，定位不到「第几块哪一维」，因此保留本条"
                    "单独出 finding。IMG 不比强调：图片块不承载行内强调。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = _blocks_by_kind(art.outline(ml))
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = _blocks_by_kind(art.outline(lg))
            body = art.body(lg) or ""
            for k, base_blocks in base.items():
                if k == "IMG":
                    continue
                labels = _DETAIL_LABELS.get(k, [])
                cur_blocks = cur.get(k, [])
                for n, (_bi, d) in enumerate(base_blocks):
                    if n >= len(cur_blocks):
                        continue
                    _ci, cd = cur_blocks[n]
                    for lab in EMPHASIS_DIMS:
                        if lab not in labels:
                            continue
                        j = labels.index(lab)
                        if j >= len(d) or j >= len(cd) or d[j] == cd[j]:
                            continue
                        emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                             "第%d个%s块 的%s与 %s 不一致：基准 %s，本语言 %s%s"
                             % (n + 1, k, lab, ml, d[j], cd[j],
                                _block_misalign_hints(body)))
                    if k == "LIST" and LBL_ITEM_BOLD in labels:
                        j = labels.index(LBL_ITEM_BOLD)
                        if j < len(d) and j < len(cd) and d[j] != cd[j]:
                            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                                 "第%d个列表 的逐项加粗分布与 %s 不一致%s"
                                 % (n + 1, ml, _block_misalign_hints(body)))


def review(finding, view):
    return finding
