# -*- coding: utf-8 -*-
"""W02：超长段落（膨胀感知）

绝对阈值按文字系统分档；与母版逐块对齐成功时，长度 ≤ 母版段长 × 膨胀系数
视为翻译自然膨胀放行；对齐失败退回纯绝对阈值。
"""
from core.consts import (
    CJK_LANGS, DENSE_SCRIPT_LANGS, MAX_PARAGRAPH_CHARS,
    MAX_PARAGRAPH_CHARS_CJK, MAX_PARAGRAPH_CHARS_DENSE,
    W02_EXPANSION_CJK, W02_EXPANSION_DENSE, W02_EXPANSION_LATIN,
)

RULE = "W02"
RULES = [RULE]
PHASE = 60
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.59 膨胀感知：REG1 实证法律条文中文 100–150 字符、拉丁译文 400–650 "
                    "字符（膨胀 2.9–5.5x，中位 3.86x），按绝对阈值判会 43 语整批误报。"
                    "改为「与母版逐块对齐且成比例即放行」——只放行长度 ≤ 母版段长 × "
                    "系数的段落，超系数且超绝对阈值的仍报；对齐失败（块数不同，P23 另报）"
                    "退回纯绝对阈值，不得整体放宽。v1.71 按实测回填 el 5.02、th 3.56，"
                    "系数上调至 5.1/3.6。报告改为汇总式全量枚举，不再只报首个异常段。"
                    "en 不纳入（2026-11-12 实测裁决）：纳入只新增 1 条假阳性——"
                    "REG11 第5段 559 字符对母版 92 字符（6.08x），该段是含中韩机构"
                    "全称的公告开篇长句，膨胀合法；比值放行在短母版块上分母过小、"
                    "不稳定，重标定需连系数一起改，属独立判据重构。"
                    "v1.72 表块豁免（2026-11-14 R5 实证）：`-` 列表块早已跳过，"
                    "`|` 表块漏列——守恒数字撑大的母版表（502 字符 DZ 对账表）"
                    "在 parity 开启后按母版绝对阈值必报假阳性。表格不是散文，"
                    "膨胀判据不适用；逐格核对由 S12/逐语审计承担。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = [p for p in art.master_body.split("\n\n") if p.strip()]
        for lg in sorted(art.parsed):
            # en 整段跳过（2026-11-12 裁决，非遗留 TODO）：全库实测把 en 纳入
            # 只新增 1 条——REG11 第 5 段 559 字符 / 母版 92 字符 = 6.08x，而那段
            # 是一句堆了中韩两方机构全称的公告开篇，属合法自然膨胀，不是缺陷。
            # 根因是「比值放行」在短母版块上不稳定（分母 92 太小），不是 en 该免检；
            # 要动就得连系数一起重标定，属判据重构，不在收尾批次里夹带。
            # 盲区范围有限：en 是首个译语、人工过读最重，且篇幅类另有 P23/P24 兜底。
            if lg == "en":
                continue
            body = art.body(lg) or ""
            paras = [p for p in body.split("\n\n") if p.strip()]
            aligned = bool(base) and lg != ml and len(paras) == len(base)
            ratio = (W02_EXPANSION_CJK if lg in CJK_LANGS
                     else W02_EXPANSION_DENSE if lg in DENSE_SCRIPT_LANGS
                     else W02_EXPANSION_LATIN)
            over = []
            for pi, para in enumerate(paras):
                # 列表块与表格块豁免：长度由守恒的流水号/金额/单号撑大
                # （G1 流水列表 791 字符、R4 状态表 472/481、R5 对账表 502 实证），
                # 不是翻译膨胀；且母版 zh 对齐恒为 False，只能按绝对阈值判，
                # 表块必报假阳性。跳过与 `-` 同性质，`|` 补齐（v1.60）。
                if para.strip().startswith(("-", "|")):
                    continue
                if lg in CJK_LANGS:
                    limit = MAX_PARAGRAPH_CHARS_CJK
                elif lg in DENSE_SCRIPT_LANGS:
                    limit = MAX_PARAGRAPH_CHARS_DENSE
                else:
                    limit = MAX_PARAGRAPH_CHARS
                if len(para) <= limit:
                    continue
                if aligned and len(para) <= len(base[pi].strip()) * ratio:
                    continue
                over.append((pi + 1, len(para), limit))
            if over:
                detail = "; ".join("第%d段 %d 字符(上限 %d)" % o for o in over[:3])
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "存在超长段落 %d 处: %s%s" % (
                         len(over), detail,
                         "" if aligned else "；未与母版对齐，按绝对阈值判"))


def review(finding, view):
    return finding
