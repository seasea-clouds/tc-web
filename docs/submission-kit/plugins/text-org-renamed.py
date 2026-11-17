# -*- coding: utf-8 -*-
"""R02：不得把已撤销机构（MOA / CFDA）当作现行机构

禁的不是这两个字母，而是「当作现行机构」这一事实错误。沿革叙述（NMPA,
formerly CFDA / 原 MOA 改组为 MARA）是正确写法，同段出现沿革词即放行。
扫描含法规的官方译本段——官方原文里出现旧机构名同样是事实错误。
"""
import re

from plugins._lexicon import phrase_block
from core.textutil import _enclosing_paragraph

RULE = "R02"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.63 改判定口径：原文一律禁这两个缩写，把「NMPA, formerly CFDA」"
                    "这类正确沿革叙述也判红，法规篇目 47 语反复误报。改后判「把已"
                    "撤销机构当现行机构」：同段出现 formerly / 原 … 改组为 一类沿革词"
                    "即放行。存量法规里确有把 MOA 当现行主管部门写的译本段——机构"
                    "改隶后读者按旧名找错部门，属事实错误而非风格问题，因此仍是 error，"
                    "且每语只报一处（同篇多处同因，逐条报只是噪声）。",
}

_ORG_RE = re.compile(r"\b(MOA|CFDA)\b")


_CACHES = {}


def _org_renamed_re(view):
    """沿革词表从库取（phrase-block 用途 org-renamed），拼 alternation。

    substring 行按字面转义，regex 行（ex\b）原样；带模块级缓存。
    """
    rows = phrase_block(view, "org-renamed").get("*", ())
    key = tuple((w, m.get("mode")) for w, m in rows)
    pat = _CACHES.get(key)
    if pat is None:
        pat = re.compile("|".join(
            re.escape(w) if m.get("mode") == "substring" else w
            for w, m in rows), re.I)
        _CACHES[key] = pat
    return pat


def run(view, emit):
    org_renamed_re = _org_renamed_re(view)
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            for m in _ORG_RE.finditer(body):
                if org_renamed_re.search(_enclosing_paragraph(body, m.start())):
                    continue
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "把已撤销机构 %s 当作现行机构（现为 MARA / NMPA；"
                     "叙述沿革请写明 formerly / 原 … 改组为）" % m.group(1))
                break


def review(finding, view):
    return finding
