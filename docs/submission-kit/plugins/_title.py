# -*- coding: utf-8 -*-
"""plugins/_title.py — 标题形态工具（空值/长度/冒号/破折号/连字符/数字区间）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。


from core.consts import (
    MAX_TITLE,
    TITLE_BAR_DASHES,
    TITLE_COLONS,
    TITLE_HYPHENS,
    TITLE_MINUS_SIGNS,
    TITLE_RANGE_DASHES,
)


def title_shape_errors(title):
    """F03 标题形态（v1.41）：空值 / 超长 / 分隔符形状。

    只禁「作分隔用」的标点，词内连字符与数字区间放行；亚美尼亚 ֊、
    希伯来 ־ 等文字系统自带的词内连字符不在射程内。
    """
    errs = []
    if not title.strip():
        errs.append("title 不能为空")
        return errs
    if len(title) > MAX_TITLE:
        errs.append("title 超长（%d > %d）" % (len(title), MAX_TITLE))
    if _title_bad_colon(title):
        errs.append("title 不得用冒号作副标题分隔（数字间的比例/时间除外）")
    if any(ch in TITLE_BAR_DASHES for ch in title):
        errs.append("title 不得含破折号/横线（— ― －）")
    if _title_bad_range_dash(title):
        errs.append("title 的 en dash/减号只能用于数字或编号区间（如 2–4、S0–S13）")
    if _title_bad_hyphen(title):
        errs.append("title 不得用连字符作分隔（不得贴空白、在首尾或连写；"
                    "词内连字符如 e-commerce 合法）")
    return errs


def _title_bad_colon(title):
    """冒号只放行数字之间；其余都是副标题分隔。"""
    for i, ch in enumerate(title):
        if ch not in TITLE_COLONS:
            continue
        prev = title[i - 1] if i else ""
        nxt = title[i + 1] if i + 1 < len(title) else ""
        if not (prev.isdigit() and nxt.isdigit()):
            return True
    return False


def _title_bad_range_dash(title):
    """en/figure dash 与减号都只放行数字或编号区间。"""
    for i, ch in enumerate(title):
        if ch in TITLE_RANGE_DASHES or ch in TITLE_MINUS_SIGNS:
            if not _title_is_range(title, i):
                return True
    return False


def _title_bad_hyphen(title):
    """连字符只放行词内形：两侧非空白、不在首尾、不与其他连字符连写。

    这样 e-commerce / cross-border / U.S.-China / COVID-19 合法，
    `Title - Subtitle` / `Title- Subtitle` / `-Title` / `Title-` / `A--B`
    都会被判红。无空格的 `Title-Subtitle` 与词内连字符同形，按词内放行
    （没有词典就无法可靠区分），标题分句请用逗号/句号。
    """
    for i, ch in enumerate(title):
        if ch not in TITLE_HYPHENS:
            continue
        prev = title[i - 1] if i else ""
        nxt = title[i + 1] if i + 1 < len(title) else ""
        if (not prev or not nxt or prev.isspace() or nxt.isspace()
                or prev in TITLE_HYPHENS or nxt in TITLE_HYPHENS):
            return True
    return False


def _title_is_range(title, i):
    """title[i] 是否是合法的数字/编号区间连接符。

    2–4 / 2020–2025 / 10:30：两侧都是数字。
    S0–S13 / A1–A5：前一位是数字，后一位是「字母 + 数字」——编号区间的
    右端常带字母前缀（S0–S13），只按 digit–digit 判会漏掉整族。
    其余（Title–Subtitle、2020–Outlook）一律不是区间。
    """
    if i == 0 or i + 1 >= len(title):
        return False
    if not title[i - 1].isdigit():
        return False
    if title[i + 1].isdigit():
        return True
    return (title[i + 1].isalpha()
            and i + 2 < len(title) and title[i + 2].isdigit())
