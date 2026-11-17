# -*- coding: utf-8 -*-
"""P15：标点前不多余空格

`fin .` 这种空格来自复制或英文习惯，法语等语向的正字法只在特定标点前留空格。
"""
import re

from plugins._shared import fmt_hits
from core.textutil import _line_of
from plugins._lang import _p15_space_punct_hits

RULE = "P15"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "英文输入法习惯把句号前留空格；法语分号/问号前留空格是合法正字法，所以 SPACE_PUNCT_RE 只收逗号与句点、且排除数字之后（避免拆千分位），按形状判、不按语向判，减少误报。"
          "v2.27（REG69 144 号公告实测）补官方文件后缀豁免：README 要求非拉丁语向的拉丁串前后留空格，"
          "而 `.docx / .pdf / .xls / .html` 这类官方逐字后缀的点被 SPACE_PUNCT_RE 当成句读标点，"
          "47 语 B07 各 1 条整层假红（P15 × 47）。按缺陷族豁免「空格＋点＋2~5 拉丁字母＋非字母」，"
          "与 P42 的 `_P42_FILE_EXT_RE` 同口径、不按篇登记词形；句末 `fin .`、单字母 `.x`、"
          "6 字母形近串 `.docxxx` 仍报红，负向对照见 selftest/_p15_file_ext_mask.py。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            hits = [(_line_of(body, st), "%r" % tok)
                    for st, tok in _p15_space_punct_hits(bare)]
            if hits:
                emit(RULE, SEVERITY, tag, "标点前有空格: " + fmt_hits(hits))

def review(finding, view):
    return finding
