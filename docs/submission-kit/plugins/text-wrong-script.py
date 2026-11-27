# -*- coding: utf-8 -*-
"""P56：正文不得出现非本语言文字系统的字母（串稿/复制残留）

码位级兜底：某语文件里混进另一语系的字母，多为串稿或复制粘贴残留。法规线
error（译本出现非本语字母即为事故）；博客线 warning（英文稿引中文原词是合法写法）。

v1.76 豁免：官方标准目录行（SN/T 编号行）内的希腊字母科学记号属官方标准名
原文（μm、α-烯烃、γ能谱），逐字保留义务优先于文字纯度启发式；仅豁免 GREEK，
西里尔/阿拉伯等字母在目录行仍是串稿事故；数字位仍由 P36 把守。
"""
import re

from plugins._health import _p56_message, _p56_wrong_script_hits

RULE = "P56"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.72 立规、v1.75 分档：法规 192 份 + 博客 480 份 mdx 全部登记在 "
          "P56_LANG_SCRIPTS 表，升档前实测现存命中 0 处（正对照：he 稿注入"
          "阿拉伯字母 الحصري 后照出 6 处）。法规升 error——译本出现非本语字母"
          "就是串稿事故，没有「作者故意为之」的豁免；博客留 warning——英文稿"
          "引中文原词（品牌名、公告标题）是合法写法，不能由这条锁死。"
          "v1.76（REG262 实证，2026-11-22）：标准发布公告家族（141 号 7 项 → "
          "158 号 111 项）的官方目录行标准名含科学记号希腊字母（小于75μm矿物"
          "集料、乙烯-α-烯烃、γ能谱分析），zh 母版与 47 语译本均须逐字保留，"
          "P56 三处 error 全部误伤。豁免口径：行首形状 ^SN/T\\s*\\d+(\\.\\d+)*"
          "\\s*—\\s*\\d{4}\\s 的官方标准目录行上仅豁免 GREEK；西里尔/阿拉伯等"
          "字母在目录行仍照出（串稿事故不豁免），拉丁字母本就放行；数字位由 "
          "P36 独立把守不受影响。",
}

# 官方标准目录行形状：SN/T 编号（可含 .子号）+ 破折号 + 四位年份 + 空格
_CATALOG_ROW_RE = re.compile(r"^SN/T\s*\d+(?:\.\d+)*\s*—\s*\d{4}\s")


def run(view, emit):
    for art in view.articles:
        sev = "error" if art.is_reg else "warning"
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            lines = body.split("\n")
            hits = [h for h in _p56_wrong_script_hits(body, lg)
                    if not (h[2] == "GREEK" and 0 < h[0] <= len(lines)
                            and _CATALOG_ROW_RE.match(lines[h[0] - 1]))]
            if hits:
                emit(RULE, sev, "%s/%s" % (lg, art.slug),
                     "正文出现非本语言文字系统的字母（疑似串稿/复制残留）: "
                     + _p56_message(hits))


def review(finding, view):
    return finding
