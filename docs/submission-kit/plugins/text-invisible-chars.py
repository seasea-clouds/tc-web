# -*- coding: utf-8 -*-
"""P14：不出现隐形/零宽字符

软连字符、零宽空格、BOM、双向控制符、替换字符都是编辑器或复制残留。
"""
import re

from plugins._shared import fmt_hits
from core.consts import INVISIBLE_ALWAYS, ZWNJ_OK_LANGS, ZWJ_OK_LANGS

RULE = "P14"
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
    RULE: "零宽字符肉眼不可见但会让检索失效、让站方搜索命中不到；BOM 混进正文还会把首段标题吃掉。ZWNJ/ZWJ 在 ur/fa/ps/ar 与 bn/ne/si/hi/th/ta/ka 是正字法必需，按语向豁免，不能一刀切删除。",
}


def run(view, emit):
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\u2063", body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", "\u2063", bare)
            # 逐行定位（与历史口径一致）：行号是作者唯一能直接跳过去的位置，
            # 只报字符名会让作者全文搜不可见字符，等于没给可操作信息。
            hits = []
            for i, ln in enumerate(body.split("\n"), 1):
                bad = [name for ch, name in INVISIBLE_ALWAYS.items() if ch in ln]
                if "\u200c" in ln and lg not in ZWNJ_OK_LANGS:
                    bad.append("ZWNJ")
                if "\u200d" in ln and lg not in ZWJ_OK_LANGS:
                    bad.append("ZWJ")
                if bad:
                    hits.append((i, "%s" % sorted(set(bad))))
            if hits:
                emit(RULE, SEVERITY, tag,
                     "含隐形字符（多为编辑器/复制残留，应删除）: "
                     + fmt_hits(hits))

def review(finding, view):
    return finding
