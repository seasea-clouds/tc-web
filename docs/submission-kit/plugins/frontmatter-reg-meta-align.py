# -*- coding: utf-8 -*-
"""R23：法规 frontmatter 与 submission.json 逐语对齐

七个固定字段（文号/机构/发布日/施行日/状态/分类/来源 URL）必须与题录同值。
文号按去标点归一后比较（各语正字法句点不同）；source_url 不一致默认 error，
R23_KNOWN_URL_DRIFT 登记的两处已交付存量漂移降 warning（修稿后删登记）。
"""
import re

from plugins._lexicon import phrase_block
from core.textutil import _valid_iso_date as valid_iso_date

RULE = "R23"
RULES = [RULE]
PHASE = 40
CATEGORY = "frontmatter"
APPLIES_TO = ["regulation"]
NEEDS = ["meta", "parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['metadata', 'frontmatter']}

RATIONALE = {
    RULE: "v1.64 实测：题录 sourceUrl 更新为官方新链接后，47 个 mdx 的 source_url "
                    "仍是旧链接，页面「原文出处」点进去 404；另有语向 published_at "
                    "与题录相差一天（发布日期 vs 上网日期）。字段成对比较、文号按去标点"
                    "归一（亚美尼亚 ։ 、其他语 ․/。 都属正字法，逐字比会把正确译文判红）。"
                    "R23_KNOWN_URL_DRIFT 是显式登记的两处已交付漂移（REG8/id、REG9/sk），"
                    "降 warning 待稿件侧对齐后删登记——不追溯已过审成品，但新漂移一律 error。",
}

_PAIRS = (("docNumber", "doc_number"), ("issuer", "issuer"),
          ("publishedAt", "published_at"), ("effectiveAt", "effective_at"),
          ("status", "status"), ("category", "category"),
          ("sourceUrl", "source_url"))


def _norm_doc(x):
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "", x).casefold()


def _drift_map(view):
    """已交付漂移登记从库取（phrase-block 用途 r23-url-drift，key=篇目）：
    value 是语向码，meta.note 是漂移原因；修稿后删行即可。"""
    out = {}
    for key, pairs in phrase_block(view, "r23-url-drift").items():
        lg, m = pairs[0]
        out[(key, lg)] = m.get("note", "")
    return out


def run(view, emit):
    drift_map = _drift_map(view)
    for art in view.articles:
        if not art.is_reg or art.meta_state not in ("ok", "empty"):
            continue
        meta = art.meta
        for lg in sorted(art.parsed):
            fm = art.fm(lg) or {}
            for sk, fk in _PAIRS:
                sv = str(meta.get(sk) or "").strip()
                fv = str(fm.get(fk) or "").strip()
                if not fv:
                    emit(RULE, "error", "%s/%s" % (lg, art.slug),
                         "frontmatter %s 为空（submission %s=%r）" % (fk, sk, sv))
                    continue
                same = (sv == fv)
                if fk == "doc_number" and not same:
                    same = _norm_doc(sv) == _norm_doc(fv)
                if sv and not same:
                    if fk == "source_url":
                        drift = drift_map.get((art.slug, lg))
                        if drift:
                            emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                                 "已登记存量漂移（%s）：source_url 与 "
                                 "submission.sourceUrl 不一致，待稿件侧对齐后"
                                 "从 R23_KNOWN_URL_DRIFT 删除（submission %r / "
                                 "frontmatter %r）" % (drift, sv[:70], fv[:70]))
                        else:
                            emit(RULE, "error", "%s/%s" % (lg, art.slug),
                                 "source_url 与 submission.sourceUrl 不一致"
                                 "（未登记的新漂移，请核对官方 URL 并对齐）："
                                 "submission %r / frontmatter %r"
                                 % (sv[:70], fv[:70]))
                    else:
                        emit(RULE, "error", "%s/%s" % (lg, art.slug),
                             "%s 与 submission.%s 不一致（%r / %r）"
                             % (fk, sk, fv[:60], sv[:60]))
                if fk in ("published_at", "effective_at") \
                        and not valid_iso_date(fv):
                    emit(RULE, "error", "%s/%s" % (lg, art.slug),
                         "frontmatter %s 不是合法日期: %r" % (fk, fv))
                if fk == "source_url" and not re.match(r"^https?://[^\s]+$", fv):
                    emit(RULE, "error", "%s/%s" % (lg, art.slug),
                         "frontmatter source_url 形态非法: %r" % fv[:70])


def review(finding, view):
    return finding
