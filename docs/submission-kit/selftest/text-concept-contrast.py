# -*- coding: utf-8 -*-
"""自检：P75 —— 对立概念是否被译成同一个词

两段（与 P74 臂同构）：

A. 纯函数段（`audit`）：构造词表 + 母版文本，验证两条口径——
   计数口径：母版提 A、译文只用 B 族 → 必报；译文用了 A 族 → 静默；
   母版没提 A → 静默（缺失不判）；该语两族合一（mode=merged）→ 静默。
   块级口径：母版 ≥2 段对举全丢 → 必报（即使 A 在别处出现过）；译文保留
   任一段对举 → 静默；母版只有 1 段对举（拆段常态）→ 静默；对立族用量
   低于母版 → 静默。
   绝对量下限：块级口径 MIN_N=3；计数（归因）口径 MIN_ATTR=5——归因是
   「多出来的用量 ≈ 缺失量」的等量代换，次数越小容差与信号越同量级（全库
   635 条告警里 598 条是「放行 1 次」的小计数巧合），必须静默。
   这一段就是「注入缺陷 → 报红」的等价物，不依赖线上库。
B. 真实管线段：用 `checker.check` 跑官方尺（template/blog），断言 P75 零
   命中——新判据不许把标准尺判红。
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, KIT)
sys.path.insert(0, HERE)

from core import checker, loader                                   # noqa: E402
from core.model import Context                                     # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "p75", os.path.join(KIT, "plugins", "text-concept-contrast.py"))
P75 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P75)

TABLE = {
    "免税": {"pair": "放行", "note": "",
             "langs": {"de": {"forms": ("Befreiung",), "mode": "check"},
                       "fa": {"forms": ("مالیات بر ارزش افزوده",), "mode": "check"},
                       "bg": {"forms": (), "mode": "merged"}}},
    "放行": {"pair": "免税", "note": "",
             "langs": {"de": {"forms": ("Freigabe",), "mode": "check"},
                       "fa": {"forms": ("ترخیص",), "mode": "check"},
                       "bg": {"forms": (), "mode": "merged"}}},
}

def _blocks(zh_unit, n):
    """n 段相同母版块（计数口径要求两侧各 ≥3 次，见 MIN_N）。"""
    return "\n\n".join([zh_unit] * n)


ZH_BOTH3 = _blocks("本批货物免税放行。", 3)          # 免税 3 / 放行 3 / 对举 3 段

# 上位/下位概念（申报 ⊂ 报关单）：en `declaration` 是 `customs declaration`
# 的一个词，按词边界计数会把后者同时算进前者（v425 要测的就是这件事）。
TBL_NEST = {
    "申报": {"pair": "报关单", "note": "",
             "langs": {"en": {"forms": ("declaration",), "mode": "check"}}},
    "报关单": {"pair": "申报", "note": "",
               "langs": {"en": {"forms": ("customs declaration",), "mode": "check"}}},
}

ZH_NEST = _blocks("申报后取得报关单。", 5)      # 申报 5 / 报关单 5 / 对举 5 段

CASES = [
    # —— 计数口径 ——
    ("正向·计数：母版两族各 5 次、译文只用对立族",
     _blocks("本批货物免税放行。", 5),
     [("de", "\n\n".join(["Die Ware wird nach Freigabe überlassen."] * 10))], 1),
    ("负向 1·计数：译文用了本族词", _blocks("本批货物免税放行。", 5),
     [("de", "\n\n".join(["Die Ware wird nach Freigabe überlassen."] * 5
                          + ["Eine Befreiung gilt für diese Sendung."] * 5))], 0),
    ("负向 2·计数：母版没提本族", "\n\n".join(["放行须审核。"] * 8),
     [("de", "\n\n".join(["Die Ware wird nach Freigabe überlassen."] * 8))], 0),
    ("负向 3·计数：bg 两族合一", ZH_BOTH3,
     [("bg", "\n\n".join(["Стоките се освобождават от мита."] * 6))], 0),
    # —— 块级口径（局部合并）——
    ("正向·对举：5 段对举在译文里全消失",
     _blocks("本批货物免税放行。", 5) + "\n\n放行后办理提离。",
     [("de", "\n\n".join(
         ["Eine Befreiung gilt nicht für diese Sendung.",     # 本族 ≥2 次（v421）
          "Eine Befreiung ist hier ausgeschlossen."]
         + ["Freigabe nur mit Zollanmeldung."] * 6))], 1),
    ("负向 4·对举：译文保留了 1 段对举",
     _blocks("本批货物免税放行。", 5) + "\n\n放行后办理提离。",
     [("de", "\n\n".join([
         "Die Ware wird nach Befreiung und Freigabe überlassen.",
         "Freigabe erfolgt nach Prüfung.",
         "Freigabe nur mit Zollanmeldung.",
         "Freigabe wird dokumentiert.",
         "Freigabe wird geprüft."]))], 0),
    ("负向 5·对举：母版只有 1 段对举",
     "\n\n".join(["本批货物免税放行。", "免税申报流程。", "免税额度说明。",
                   "放行后办理提离。", "放行须审核。", "放行须备案。"]),
     [("de", "\n\n".join(["Freigabe wird erteilt."] * 10))], 0),
    ("负向 6·对举：对立族用量低于母版",
     _blocks("本批货物免税放行。", 5) + "\n\n放行后办理提离。",
     [("de", "Eine Freigabe erfolgt. Eine Befreiung gilt.")], 0),
    # —— 绝对量下限（MIN_N=3）：A4 实测形态，放行 1 次、免税 6 次 ——
    # —— 绝对量下限（MIN_N=3）：A4 实测形态，放行 1 次、免税 6 次 —
    # —— 上位/下位嵌套（v425）：嵌套词形不得同时算两族 ——
    ("正向·嵌套：母版 申报5/报关单5，译文只有 customs declaration 10 次",
     ZH_NEST,
     [("en", "\n\n".join(["The customs declaration is filed."] * 10))], 1, TBL_NEST),
    ("负向 11·嵌套：译文另有独立 declaration 5 次",
     ZH_NEST,
     [("en", "\n\n".join(["The customs declaration is filed."] * 5
                          + ["The declaration is filed online."] * 5))], 0, TBL_NEST),
    ("负向 7·计数：被吸收侧不足 3 次",
     "\n\n".join(["免税货物清单。", "免税申报流程。", "免税额度说明。",
                   "免税凭证要求。", "免税适用范围。", "免税货物核销。",
                   "放行一次。"]),
     [("de", "\n\n".join(["Befreiung gilt."] * 7))], 0),
    # —— 族缺写法（v421）：本族整篇 0 次不是合并的证据，是词族召回问题 ——
    ("负向 8·对举：本族整篇 0 次（族缺该写法）",
     ZH_BOTH3,
     [("de", "\n\n".join(["Die Ware wird nach Freigabe überlassen."] * 10))], 0),
    # —— 零宽连接符（v421）：词形写空格、正文写 ZWNJ，不得算「本族没出现」——
    ("负向 10·零宽：正文用 ZWNJ 连写",
     _blocks("本批货物免税放行。", 5),
     [("fa", "\n\n".join(["ترخیص گمرکی انجام می‌شود."] * 10
                          + ["مالیات‌بر‌ارزش‌افزوده اعمال می‌شود."]))], 0),
    # —— 归因下限（MIN_ATTR=5，v421）：4 次时容差与信号同量级，不许判 ——
    ("负向 9·计数：母版各 4 次（低于归因下限）",
     _blocks("本批货物免税放行。", 4),
     [("de", "\n\n".join(["Die Ware wird nach Freigabe überlassen."] * 8))], 0),
]


def part_a():
    ok = True
    for case in CASES:
        name, zh, texts, want = case[:4]
        table = case[4] if len(case) > 4 else TABLE
        got = P75.audit(table, zh, texts)
        good = len(got) == want
        print("  %-4s %-40s got=%d want=%d"
              % ("OK" if good else "FAIL", name, len(got), want))
        ok &= good
    return ok


def part_b():
    ok = True
    loader.discover(KIT, tolerant=True)
    for name in ("blog", "regulation"):
        path = os.path.join(KIT, "template", name)
        if not os.path.isdir(path):
            continue
        ctx = Context(kit_dir=KIT, rules_filter={"P75"},
                      glossary_disabled=True, lexicons={})
        hits = [f for f in checker.check(path, ctx=ctx) if f.rule == "P75"]
        good = not hits
        print("  %-4s %-40s findings=%d"
              % ("OK" if good else "FAIL", "官方尺（template/%s）零命中" % name,
                 len(hits)))
        ok &= good
    return ok


def part_c():
    """复合词词干（v441）：`*` 结尾＝前缀匹配，解决日耳曼语/芬兰语焊词。

    三条都是踩出来的边界：
      ① `Einreihungs*` 必须命中 `Einreihungsentscheidung`（词干在词内部）；
      ② 裸形 `Einreihung` 命中不了它——所以基础形与词干**都要收**，
         只收词干会漏掉 `HS-Einreihung` 之外的裸词；
      ③ 裸 `*` 没有区分力，必须判无效（否则等于把整篇都算成命中）。
    """
    ok = True
    de_compound = "Die Einreihungsentscheidung bindet die Warennummer."
    ok1 = bool(P75._rx("Einreihungs*", "de").search(de_compound))
    ok2 = not P75._rx("Einreihung", "de").search(de_compound)
    ok3 = P75._rx("*", "de") is None
    for label, good in (("① 词干命中复合词", ok1),
                        ("② 裸形不命中复合词（故两者都收）", ok2),
                        ("③ 裸 `*` 判无效", ok3)):
        print("  %-4s %-40s %s" % ("OK" if good else "FAIL", label, ""))
        ok &= good
    return ok


def main():
    ok = part_a() and part_c() and part_b()
    print("%s：%s" % (os.path.basename(sys.argv[0]), "OK" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
