# -*- coding: utf-8 -*-
"""R07：正文不得暴露配图制作来源（页码引用 / 制作工具词）

对外文案里出现「p15」「第 3 页」「PowerPoint」一类痕迹，等于告诉读者这段
内容是从别处搬来的。三臂：页码引用 error、alt 里的工具词 error、散文里的
工具词 warning（可能是合法修辞，如「三层结构」之类，交人工判定）。
"""
import re

from plugins._lexicon import hits as _hits
from plugins._lexicon import phrase_block

RULE = "R07"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'metadata']}

RATIONALE = {
    RULE: "v1.35 实测：某篇正文残留「（见 p15）」与图片 alt「PPT 截图：申报流程」，"
                    "读者一眼看出内容来自内部培训材料，且页码在原文档之外毫无意义。"
                    "扫描前剥链接目标与外链 URL——URL 里没有泄漏，留着只会制造假命中；"
                    "alt 与链接文字必须保留，泄漏恰恰常藏在这两处。p0-tier-token "
                    "是官方文本里的「第 0 档」类术语，形似页码但不是，单独发免。",
}


def _page_hit(text, table, tier_tokens=()):
    """页码命中；`tier_tokens` 是「形似页码的档位名」放行表（库 p0-tier-token）。"""
    for pat, meta in table:
        for tok, _pos in _hits(pat, meta["mode"], text):
            if tok.lower() in tier_tokens:
                continue
            return tok
    return None


def _tool_rows(table):
    """按 meta.tag 取两组工具词正则：alt（含 title/excerpt）与 prose。

    `ORIGIN_TOOL_META_RE` 与 alt 全等，合并成一组——两份全等的正则各自漂移
    只会让「alt 判红、title 不判」这种不一致没人发现。
    """
    alt = tuple((p, m) for p, m in table if m.get("tag") == "alt")
    prose = tuple((p, m) for p, m in table if m.get("tag") == "prose")
    return alt, prose


def run(view, emit):
    pages = phrase_block(view, "origin-page").get("*", ())
    tier_tokens = {w.lower() for w, _m in
                   phrase_block(view, "p0-tier-token").get("*", ())}
    alt_res, prose_res = _tool_rows(phrase_block(view, "origin-tool").get("*", ()))
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            scan = re.sub(r"\]\([^)]+\)", "]()", body)
            scan = re.sub(r"https?://\S+", " ", scan)
            page = _page_hit(scan, pages, tier_tokens)
            alt = None
            for m in re.finditer(r"!\[([^\]]*)\]", scan):
                for pat, meta in alt_res:
                    got = _hits(pat, meta["mode"], m.group(1))
                    if got:
                        alt = got[0][0]
                        break
                if alt:
                    break
            if page:
                emit(RULE, "error", "%s/%s" % (lg, art.slug),
                     "正文出现来源页码引用（p15/第N页/page N 一类）: %r" % page)
            if alt:
                emit(RULE, "error", "%s/%s" % (lg, art.slug),
                     "图片 alt 出现制作工具词（图注不得点名来源）: %r" % alt)
            if page or alt:
                continue
            prose = re.sub(r"!\[[^\]]*\]", "![]", scan)
            for pat, meta in prose_res:
                got = _hits(pat, meta["mode"], prose)
                if got:
                    emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                         "正文散文出现制作工具词（可能是合法修辞，人工判定）: %r"
                         % got[0][0])
                    break
        # 元数据面：逐字段扫字符串值（列表值是结构枚举，不进射程）
        if art.meta_state != "ok":
            continue
        leak = []
        for k in sorted(art.meta):
            x = art.meta[k]
            if not isinstance(x, str) or not x.strip():
                continue
            tok = _page_hit(x, pages, tier_tokens)
            if not tok:
                for pat, meta in alt_res:
                    got = _hits(pat, meta["mode"], x)
                    if got:
                        tok = got[0][0]
                        break
            if tok:
                leak.append("%s 段「%s」" % (k, tok))
        if leak:
            emit(RULE, "error", art.slug,
                 "submission.json 暴露配图制作来源/页码引用（对外文案不得说明图来自 "
                 "PPT/幻灯片/第几页，见【v1.35】口径；改写成只讲权利的说法）: "
                 + "; ".join(leak[:6]))


def review(finding, view):
    return finding
