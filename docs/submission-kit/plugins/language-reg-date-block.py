# -*- coding: utf-8 -*-
"""P62：法规解读块1 的日期必须与 published_at 对齐（仅法规线）

母版 zh 解读块1 含 published 年份时，各语解读块1 必须含该年份（error）与该日
（warning，日期词形/编辑性省略难穷举）。月份是词形，不判。
"""
import re

from plugins import _lexicon

RULE = "P62"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.03 实测（REG11 46 语审计）：sr 解读块1 残留的是上一篇（REG10）的"
                    "「12 月 2 日」，尾块日期正确、解读段错位——跨篇复制模板的典型伤，"
                    "P19/P36 只比数字在场、看不见「日期属于哪一篇」。v2.24（REG23 回流）"
                    "加母版驱动前提：母版解读块1 本身不含日数字（「即日起」口径）时，"
                    "忠实跟随母版的译语缺日不是缺陷，46 语系统性 warning 是纯噪声。",
}

_DIGITS = {
    "fa": "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9",
    "ur": "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9",
    "ar": "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669",
    "bn": "\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef",
    "hi": "\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f",
    "ne": "\u0966\u0967\u0968\u0969\u096a\u096b\u096c\u096d\u096e\u096f",
    "ta": "\u0be6\u0be7\u0be8\u0be9\u0bea\u0beb\u0bec\u0bed\u0bee\u0bef",
    "si": "\u0de6\u0de7\u0de8\u0de9\u0dea\u0deb\u0dec\u0ded\u0dee\u0def",
}



def _block1(body):
    for p in body.split(chr(10) + chr(10)):
        s = p.strip()
        if s and s != "<!-- original -->":
            return s
    return ""


def run(view, emit):
    _lexicon.set_judge(view, RULE)
    for art in view.articles:
        if not art.is_reg:
            continue
        zfm = art.fm("zh") or {}
        zb = _block1(art.body("zh") or "")
        pub = str(zfm.get("published_at") or "")
        if not zb or not re.match(r"^\d{4}-\d{2}-\d{2}$", pub):
            continue
        yr, dy = pub[:4], pub[8:10]
        if yr not in zb:
            continue
        day_in_zh = (dy in zb) or (dy.lstrip("0") in zb)
        ctx = getattr(art.pkg, "ctx", None)
        anchor = (getattr(ctx, "master_lang", None) if ctx else None) or "zh"
        for lg in sorted(art.parsed):
            if lg == anchor:
                continue
            b = _block1(art.body(lg) or "")
            if not b:
                continue
            digits = _DIGITS.get(lg, "")
            tr = str.maketrans("0123456789", digits) if digits else None
            yr_ok = yr in b or bool(tr and yr.translate(tr) in b)
            forms = {dy, dy.lstrip("0")} - {""}
            day_ok = (any(f in b or (tr and f.translate(tr) in b) for f in forms)
                      or any(w in b.casefold() for w in
                             _lexicon.judge(RULE, "ordinal").get("sr", ())))
            if not yr_ok:
                emit(RULE, "error", "%s/%s" % (lg, art.slug),
                     u"解读块1 日期与 published_at(%s-%s) 不一致：缺年份 %s"
                     % (yr, dy, yr))
            elif not day_ok and day_in_zh:
                emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                     u"解读块1 未含 published_at 日（%s）数字形——若为序数词/"
                     u"编辑性省略日期请复核" % dy)


def review(finding, view):
    return finding
