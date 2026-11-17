# -*- coding: utf-8 -*-
"""P42：亚美尼亚语正文不得出现 ASCII 句点（句末应为 ։）

仅允许小数、 թվական 缩写「թ.」、链接/代码、官方英文声明整句与官方附件
文件后缀里的句点。ASCII 句点是英文残留的最硬信号——hy 正字法里没有这个
字符出现在句末。
"""
from plugins._lang import _p42_hy_ascii_periods

RULE = "P42"
RULES = [RULE]
PHASE = 40
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["hy"], "zones": ['body']}

RATIONALE = {
    RULE: "v1.42 实测（C3 hy）：正文句末用「.」而亚美尼亚语正字法用「։」，同一篇里"
                    "两种句点并存，读者一眼看出前段是英文直译。掩码先剥链接目标、代码、"
                    "小数与 թվական 缩写「թ.」，只判真正的句末句点——不剥就会把"
                    "「1.5%」「թ. 2024」整片判红。射程锁 hy：其他语向的句点就是正字法。"
                    "v2.26 补「点+2~5 拉丁字母」的官方附件文件后缀豁免（REG40 "
                    "136 号公告 hy 实测：两份 .docx 附件名的点被误判成句末英文句点，"
                    "而该串受 S08 verbatim 保护不能改稿），按缺陷族覆盖 "
                    ".docx/.pdf/.xls/.html，不按篇登记词形；负向对照见 "
                    "selftest/_p42_file_ext_mask.py。",
}


def run(view, emit):
    for art in view.articles:
        if "hy" not in art.parsed:
            continue
        hits = _p42_hy_ascii_periods(art.body("hy") or "")
        if hits:
            emit(RULE, SEVERITY, "hy/%s" % art.slug,
                 "正文出现 ASCII 句点「.」（句末应为 ։；仅允许小数、"
                 " թվական 缩写「թ.」与链接/代码）: "
                 + "；".join("…%s…" % h for h in hits[:3])
                 + ("；等共 %d 处" % len(hits) if len(hits) > 3 else ""))


def review(finding, view):
    return finding
