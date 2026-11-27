# -*- coding: utf-8 -*-
"""R22：法规正文（母版与全部译文）禁用数字列表块

站方惯例把官方「1.」序号规范为（N）全角括号形。数字列表块一旦进正文，
P21/P22/P23 会因序号形态差别连锁返工，必须在母版阶段就拦住。

落款行的合规日期形（「10 grudnia 2018」「10 كانون الأول/ديسمبر 2018」，
日 + 月份词 + 年份，无前导序号点）是母版同构落款，本条不判；只有带
`数字.` / `数字)` 序号形态的行才按有序列表块拦。

REG235 补充：行首四位年份 + 点（「2026. augusztus 12-én」）是年份打头的
日期行，不是有序列表编号。编号从 2026 起排的列表实际不存在，放行四位年份
（1900–2099）不会漏掉真实列表；日号打头（「17. sierpnia 2026」）仍然拦。
"""
import re

from core.consts import _OL_RE

# 行首「dd.」后直接接字母：落款日期与月份名粘连（sr「24.Децембар」实测）
_DATE_STUCK_RE = re.compile(r"^\s*\d{1,2}\.[^\W\d_]")
# 行首四位年份 + 点 + 空白：年份打头的日期行，不按有序列表编号处理
_YEAR_LEAD_RE = re.compile(r"^\s*(?:19|20)\d{2}\.\s+")
# 跨文字系统异形序号点（REG236 阶段5回流，按全库探针收窄）：
# ur 乌尔都点 U+06D4「1۔ 」不在 core 的 _OL_RE（只认 ASCII . 与 )）射程内；
# 全库 6217 份译文只读探针显示 U+06D4 存量 0 命中，扩射程不误伤。
# U+FF0E 全角点「1．」探针命中 23 处已过审存量（zh 20 + fi/ja/ko 各 1），
# 按 reference/README「探针显示会误伤存量的维持人工必检」不纳入，维持直读。
_OL_EXOTIC_RE = re.compile(r"^\s*\d{1,4}[\u06d4]\s+")

RULE = "R22"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.87 立规（REG8 实证）：初版 22 个有序列表块（「1. 2. 3.」）引发 "
                    "P25 列表符号、P23 逐块大纲、P21 条目数三族连锁返工，改一遍要动 "
                    "48 个语向。v2.00 扩到全部译文：REG10 hu 落款「2025. december (2)」"
                    "被旧口径 \\d{1,2} 漏放，靠结构对齐连环误报才暴露——正则与 _OL_RE "
                    "（\\d+ 任意位数）对齐，年份打头的日期行同样拦。博客线不受影响"
                    "（APPLIES_TO 已限 regulation）。"
                    "REG89 阶段 5-a 收口：曾另挂「末三块裸日数字起首」落款臂，实测"
                    "ar/bg/id/it/nl/pl/pt/ro/ru 九语合规落款「10 <月份词> 2018」"
                    "（与 zh/af/be/ru/uk 母版同构先例 KEEP）被整片误报；该臂撤除。"
                    "合规落款日期不判红，只有带 `数字.`/`数字)` 序号形态的行按"
                    "有序列表块拦；年份打头（2018年12月10日）不在射程。"
                    "REG93 再扩：sr「24.Децембар」日期与月名之间无空格，旧的 "
                    "_OL_RE 要求 `dd.` 后至少一个空格，整类漏放；本规则同时报"
                    "行首「dd.」直接接字母的粘连形，要求补空格或改用本语日期格。"
                    "REG121（2026-11-18 db-write-2）再证：约 10 个语向落款写成"
                    "「17. <月份词> 2026」，点号被当成有序列表，R22 连锁触发；"
                    "统一改为「17 <月份词> 2026」后过检，本条口径不变。"
                    "REG235（2026-11-20 db-write-3）补口：hu 法规日期行"
                    "「2026. augusztus 12-én」同样被 `\\d+.` 误判为列表；行首四位"
                    "年份（1900–2099）后接点与空白属年份日期形，放行。日号打头"
                    "（17. sierpnia）仍按列表拦，真实列表编号不受影响。"
                    "REG236 阶段5回流（2026-11-21）：core 的 _OL_RE 只认 ASCII `.` 与 `)`，"
                    "ur 乌尔都点 `1۔`(U+06D4) 属机检盲区——此前靠逐语直读才发现。"
                    "新增 _OL_EXOTIC_RE 覆盖 U+06D4；改前跑全库 6217 份译文只读探针，"
                    "U+06D4 存量 0 命中，确认不误伤。U+FF0E 全角点 `1．` 虽同为盲区，"
                    "但探针命中 23 处已过审存量（zh 20 + fi/ja/ko 各 1），按 "
                    "reference/README「探针显示会误伤存量的维持人工必检」不纳入，"
                    "维持逐语直读。四位年份打头日期行仍由 _YEAR_LEAD_RE 放行。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            lines = []
            for i, ln in enumerate(body.split("\n"), 1):
                if ((_OL_RE.match(ln) or _OL_EXOTIC_RE.match(ln))
                        and not _YEAR_LEAD_RE.match(ln)):
                    lines.append(i)
            if lines:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "法规译文第 %s 行出现数字列表块（站方惯例：官方 \"1.\" 序号"
                     "规范为（N）形，参见 REG1/2/7/8/10 已交付各语）"
                     % ", ".join(str(n) for n in lines[:6]))
            stuck = [i for i, ln in enumerate(body.split("\n"), 1)
                     if _DATE_STUCK_RE.match(ln)]
            if stuck:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "法规译文第 %s 行「dd.」后直接接字母（日期/序号粘连，"
                     "落款日期须在点后补空格）"
                     % ", ".join(str(n) for n in stuck[:6]))


def review(finding, view):
    return finding