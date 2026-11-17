# -*- coding: utf-8 -*-
"""P69：官方文本日期不得追加冗余数字括注

完整日期后写 `(2026-9-28)` 一类数字括注是取巧写法（为凑数字校验），破坏官方
文本保真。条块编号 (2)、年份区间 (2026-2027)、版本号 (1.2.3) 不受影响。
"""
import re

from core.textutil import blocks as _blocks

RULE = "P69"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.22 立规（REG23 实证，wb-reg-3）：en 译语为凑数字校验把日期块写成"
                    "`28 September 2026 (2026-9-28).`——数字括注是取巧写法，破坏官方"
                    "文本保真。正则只收「括号内恰为三段数字日期」（YYYY-M-D 或 D-M-YYYY，"
                    "分隔符 - . / 含全角形）；全库探针（submission/ + template/ 共 2615 "
                    "文件）0 命中，判据无条件生效、不绑篇目锚点。",
}

DATE_PAREN_RE = re.compile(
    r"[(（]\s*(?:\d{4}\s*[-./\uFF0D\uFF0F]\s*\d{1,2}\s*[-./\uFF0D\uFF0F]\s*\d{1,2}"
    r"|\d{1,2}\s*[-./\uFF0D\uFF0F]\s*\d{1,2}\s*[-./\uFF0D\uFF0F]\s*\d{4})\s*[)）]"
)


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            for bi, blk in enumerate(_blocks(art.body(lg) or "")):
                m = DATE_PAREN_RE.search(blk)
                if m:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块出现数字日期括注 %s（官方日期用本语完整日期形，"
                         "不得追加冗余数字括注）" % (bi + 1, m.group(0)))


def review(finding, view):
    return finding
