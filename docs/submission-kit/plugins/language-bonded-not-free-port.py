# -*- coding: utf-8 -*-
"""P88：母版说「保税」，译文却压成「自由港/自贸区/自由港区」

REG121（海关总署 2026 年第 121 号公告）47 语逐篇人工审计实证：22 个语向把
「保税区域」译成 free port / free zone / zona franca / frihavn / ปลอดภาษี 等
「自由港/免税港」词族，标题、摘要、正文三层同时错。语法、块数、字数、
quote/数字判据全绿，读者看到的却是另一个海关监管制度。

判据口径：
  * 只在母版对应块/字段出现「保税」、且同块**没有**「自由港/自由贸易港/
    自贸港」时生效——真正讲自由港的文章不误伤；
  * 译文出现该语向登记的自由港/自贸区错形即 error；
  * 未出现错形、但也找不到本语「bonded/customs warehouse」正形时，报
    warning 交人工回读（避免把「特殊区域」当成已译对）。
词表随本插件维护；新增语向只追加条目，不改判据逻辑。
"""
from plugins import _lexicon

RULE = "P88"
RULES = [RULE]
PHASE = 51
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["frontmatter", "body"]}

RATIONALE = {
    RULE: "REG121 47 语逐篇人工审计回流（2026-11-18，db-write-2）：母版「洋山特殊"
          "综合保税区、洋浦保税港区」在 22 语被压成「自由港/自贸区」——af "
          "vryehawe、de Freihäfen/Zollfreizone、es/po/fr zona franca、it zone "
          "franche、pl strefa wolnocłowa、ru зона беспошлинной торговли、th "
          "เขตปลอดภาษี、tr serbest liman、vi khu cảng miễn thuế 等；正文块数、"
          "数字、引号、术语契约都不报。把「保税 ≠ 自由港」固化为语向级错形表，"
          "并只在母版块含「保税」且不含「自由港/自贸港」时执行，避免误伤真正"
          "讲自由港的稿件。缺正形只报 warning，交人工回读。",
}

# 该语向把「保税」写成自由港/自贸区/免税港的典型词形（casefold 子串匹配）。

# 本语「保税/海关监管仓库」正形（任一命中即视为已写对）。


def _has(text, forms):
    low = (text or "").casefold()
    return any(f.casefold() in low for f in forms) if forms else False


def _wrong(text, lg):
    low = (text or "").casefold()
    for w in _lexicon.judge(RULE, "wrong").get(lg, ()):
        if w.casefold() in low:
            return w
    return None


def _context(text):
    """母版块/字段是否真的在讲保税，而不是自由港/自贸港。"""
    text = text or ""
    if "保税" not in text:
        return False
    return not any(x in text for x in ("自由港", "自由贸易港", "自贸港"))


def _check_pair(zh, other, lg, where, emit):
    if not _context(zh):
        return
    w = _wrong(other, lg)
    if w:
        correct = " / ".join(
            _lexicon.judge(RULE, "correct").get(lg, ()))[:90]
        emit(RULE, "error", "%s/%s" % (lg, where["slug"]),
             "%s出现「%s」——母版讲的是保税监管区域，不是自由港/自贸区；"
             "本语应写「%s」" % (where["label"], w, correct or "（见 CORRECT 表）"))
        return
    if not _has(other, _lexicon.judge(RULE, "correct").get(lg)):
        emit(RULE, "warning", "%s/%s" % (lg, where["slug"]),
             "%s母版含「保税」，但未检出本语保税/海关仓库正形，请回读是否被"
             "压成「特殊区域」" % where["label"])


def run(view, emit):
    _lexicon.set_judge(view, RULE)
    for art in view.articles:
        ml = art.master_lang
        if not ml or ml not in art.parsed:
            continue
        kinds = art.parsed.keys()
        zh_title = str((art.fm(ml) or {}).get("title") or "")
        zh_excerpt = str((art.fm(ml) or {}).get("excerpt") or "")
        lgs = [lg for lg in sorted(kinds) if lg != ml]
        for lg in lgs:
            fm = art.fm(lg) or {}
            if zh_title:
                _check_pair(zh_title, str(fm.get("title") or ""), lg,
                            {"slug": art.slug, "label": "标题"}, emit)
            if zh_excerpt:
                _check_pair(zh_excerpt, str(fm.get("excerpt") or ""), lg,
                            {"slug": art.slug, "label": "摘要"}, emit)
            zb = art.blocks(ml)
            ob = art.blocks(lg)
            for i in range(min(len(zb), len(ob))):
                _check_pair(zb[i], ob[i], lg,
                            {"slug": art.slug, "label": "正文第%d块" % (i + 1)},
                            emit)


def review(finding, view):
    return finding
