# -*- coding: utf-8 -*-
"""P73：半角分号后不得紧贴非空白（句中分号后应有空格）

闭类标点（引号/闭括号）、markdown 语法标记（`*` 强调闭合、`\\` 行尾硬换行）
与左括号（官方条款枚举 `;(i)`）豁免。
"""
import re

RULE = "P73"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v2.20 立规（O7 阶段 4 逐篇人工审核实抓）：be/hr/sl/sq/uk 五语摘要共 20 处"
                    "「;」后紧跟下一词（часу;рахунак），42 个语向的分号后均有空格——"
                    "离群成立而机检全绿漏放（P15 只管标点前空格，F07 只管长度）。"
                    "豁免三类：闭类标点（希腊语问号 + 闭引号 SKU;\"）、markdown 语法"
                    "（`;*` 强调闭合、`;\\` 行尾硬换行）、左括号（REG21 实证 17 处 "
                    "`;(i)` 官方条款枚举）。档位 warning，交人工终审。",
}

_TIGHT_RE = re.compile(
    r";(?=[^\s\"'\u201d\u2019\u00bb\uff09)\]\u3011\u300b\u300f}*\\(\uff08\\])")
_MD_LINK_TARGET_RE = re.compile(r"\]\([^)]*\)")


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            fm = art.fm(lg) or {}
            ref_urls = " ".join(
                str(r.get("url", "")) for r in (fm.get("references") or [])
                if isinstance(r, dict))
            zones = [("title", str(fm.get("title") or "")),
                     ("excerpt", str(fm.get("excerpt") or ""))]
            body_txt = _MD_LINK_TARGET_RE.sub(" ", art.body(lg) or "")
            if ref_urls:
                body_txt = body_txt.replace(ref_urls, " ")
            zones.append(("body", body_txt))
            for zone, txt in zones:
                hits = list(_TIGHT_RE.finditer(txt))
                if not hits:
                    continue
                first = txt[max(0, hits[0].start() - 12):hits[0].start() + 14]
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "%s 层分号后紧贴非空白 %d 处（例 …%s…；句中分号后应有"
                     "空格；闭类标点/链接目标放行）" % (zone, len(hits), first))


def review(finding, view):
    return finding
