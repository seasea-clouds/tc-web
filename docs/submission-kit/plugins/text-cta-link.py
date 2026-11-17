# -*- coding: utf-8 -*-
"""B09：文末 CTA 链接与文字必须逐语正确

结尾 10 行内必须有一个 `[<本语 Contact us>](/<lang>/packages/)`；法规线豁免。
CTA 文字词表在 `lexicons` 的 phrase-block（用途 cta-text），增补语向改库即可。
"""
import re

from plugins._lexicon import phrase_block

RULE = "B09"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "CTA 是唯一的正文外链：路径写错成 /packages/ 或缺语言段会 404；文字没翻译时 48 语页面统一显示英文 Contact us。法规详情页底部由站点固定渲染 CTA 与评估表单，故 is_reg 豁免（B09 白名单）。",
}


def run(view, emit):
    cta = phrase_block(view, "cta-text")
    for art in view.articles:
        for lg in art.langs:
            body = art.body(lg)
            tag = "%s/%s" % (lg, art.slug)
            if art.kind == "regulation":
                continue
            tail = [ln for ln in body.split("\n")[-10:] if ln.strip()]
            link = None
            for ln in tail:
                m = re.search(r"(?<!!)\[([^\]]+)\]\(([^)\s]+)\)", ln)
                if m:
                    link = (m.group(1), m.group(2))
                    break
            if not link:
                emit(RULE, SEVERITY, tag,
                     "结尾缺少 CTA 链接 [Contact us](/<lang>/packages/)")
                continue
            txt, url = link
            expected = "/%s/packages/" % lg
            if url.rstrip("/") != expected.rstrip("/"):
                emit(RULE, SEVERITY, tag,
                     "CTA 链接必须是 %s，当前 %s" % (expected, url))
            rows = cta.get(lg) or cta.get("*") or ()
            if rows:
                expected = rows[0][0]
                if txt.strip() != expected:
                    emit(RULE, SEVERITY, tag,
                         "CTA 文字应为 %r，当前 %r" % (expected, txt))
            elif re.match(r"(?i)^contact\s*us", txt.strip()):
                emit(RULE, SEVERITY, tag, "CTA 文字未翻译（仍为英文 Contact us）")

def review(finding, view):
    return finding
