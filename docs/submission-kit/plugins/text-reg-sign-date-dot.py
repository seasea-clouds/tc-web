# -*- coding: utf-8 -*-
"""P96：法规落款日期不得写成 `28. Dezember 2025` / `2026. szeptember 1.`
（行首序号点形状）

REG232（市场监管总局 2025 年第 57 号公告）全语审计实测：de/fi/hr/sl/sr 落款写成
`28. <月份> 2025`，机器把行首 `28.` 当成有序列表标记，R22/P21/P22/P23 整片误判成
数字列表块，人工只能逐语改日期写法绕过。日期本身没错，错在「行首序号点」与
Markdown 列表语法同形。

REG256（海关总署 2026 年第 132 号公告）再证实另一种同形：hu 落款
`2026. szeptember 1.` 以四位年份+点开头，R22 已按 `_YEAR_LEAD_RE` 放行，
但结构解析器仍把整块判成 LIST，P21/P22/P23 连锁报红。根因相同：行首
`YYYY.` 与有序列表同形。本条只扫法规正文末尾 5 块、只认单行日期块；
命中即提示加日期标签（`Kelt:` / `Dne` / `Den` / `Annettu`）或改无点日期，
不判正文其他列表。官方尺 regulation 正文末尾无此形状，基线为零。
"""
import re

RULE = "P96"
RULES = [RULE]
PHASE = 60
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG232（2026-11-20 逐语审计）：de/fi/hr/sl/sr 五语落款 `28. <月份> 2025` "
          "被 R22 当成数字列表块，机检报红但日期内容本身无误。根因是行首 `NN.` "
          "与 Markdown 有序列表 `1.` 同形，任何语向写成 `28. Dezember 2025` 都会复发。"
          "本条只判法规正文末尾 5 块内、整块只有一行的 `NN. … YYYY` 日期，"
          "提示改为无点日期；不判正文中间的多行列表，避免把真正的有序列表误伤。"
          "REG256（2026-11-22 db-write-3）补口：hu 落款 `2026. szeptember 1.` 以四位"
          "年份+点开头，R22 的 _YEAR_LEAD_RE 已放行，但 core 的 _block_kind 仍按 "
          "_OL_RE 判成 LIST，P21/P22/P23 三族连锁报红（实测 3 error）。同一正则"
          "补判 `YYYY. … DD.` 单行日期块，提示加 `Kelt:` 等日期标签或改无点写法；"
          "射程仍限末尾 5 块且整块单行，正文中的年份列表不受影响。",
}

_DATE_LINE = re.compile(r"(?m)^\d{1,2}\.\s+\S.{0,40}\d{4}\s*$")
# REG256 实证：四位年份 + 点开头的单行日期块（hu `2026. szeptember 1.`）
_YEAR_DATE_LINE = re.compile(r"(?m)^\d{4}\.\s+\S.*\d{1,2}\.?\s*$")


def _blocks(text):
    return [b.strip() for b in re.split(r"\n\s*\n", text or "") if b.strip()]


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            blocks = _blocks(art.body(lg) or "")
            if not blocks:
                continue
            for block in blocks[-5:]:
                if len(block.splitlines()) != 1:
                    continue
                if _DATE_LINE.match(block):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "落款日期写成行首序号点形状 %r；Markdown 会按有序列表解析，"
                         "R22/P21/P22/P23 会误判成数字列表块，请改为无点日期写法"
                         % block.strip())
                    continue
                if _YEAR_DATE_LINE.match(block):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "落款日期块以四位年份+点开头 %r；Markdown 仍会按有序列表"
                         "解析，P21/P22/P23 会误判成数字列表块，请在日期前加标签"
                         "（Kelt:/Dne/Den/Annettu 等）或改为无点日期写法"
                         % block.strip())


def review(finding, view):
    return finding
