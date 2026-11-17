# -*- coding: utf-8 -*-
"""工具级自检：三条审计回流术语契约的射程与匹配机理（2026-11-13）。

`_` 前缀：契约本身没有独立插件文件（分别由 P43 glossary-banned-words 与
S08 glossary-term-presence 执行），按 A6/A7 不能占用正名臂；由
`submit.py selftest --kit` 单独计数。

覆盖三条只在 tmp/ 注入脚本里验过、却未进常驻回归的回流：
  1. banned:reg34-sr-kip-batch —— «кип» 词边界档不得误伤 «ек**ип**а»；
  2. body:reg36-issuer-hy-ms-full —— only_slug 收窄 + hy/ms 落款正形；
  3. body:reg36-cross-article-residue —— 按篇禁用正则命中上篇专名、
     不误伤本篇合法的 «Niger» / «尼日尔» / 文号与年份。

另加 2026-11-14 R1 博客七条语义契约的落库完整性臂：锚点、scope、
only_slug、require 语向数、forbid 不得与 require 自碰。契约由 S08 常驻
执行，本臂防「回流了却静默失效」（被删、锚点漂移、作用域放宽）。

本臂只读术语库与共享匹配函数，不建官方尺副本、不改线上契约。
"""
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core import db as _db                                    # noqa: E402
from plugins._glossary import _ban_hits                       # noqa: E402

SLUG_137 = "gacc-announcement-137-niger-animal-disease-ban"
SLUG_148 = "gacc-announcement-148-namibia-fmd"
SLUG_R1 = "eight-metrics-china-market-entry"
R1_SPEC = {
    "body:r1-monthly-brief-term": ("月度简报", 19),
    "body:r1-pyramid-recruiting": ("拉人头", 12),
    "body:r1-first-batch-sku": ("首批 SKU", 13),
    "body:r1-pipl-china": ("个人信息保护法", 17),
    "body:r1-four-deliveries": ("交付四样东西", 12),
    "body:r1-promoter-term": ("推广员", 1),
    "body:r1-median-term": ("中位数", 1),
}
IDS = ("banned:reg34-sr-kip-batch",
       "body:reg36-issuer-hy-ms-full",
       "body:reg36-cross-article-residue") + tuple(R1_SPEC)


def _load():
    pv = _db.load_policy(os.path.join(_KIT, "data", "glossary.db"))
    by_id = {c["id"]: c["payload"] for c in pv.contracts}
    return {cid: by_id.get(cid) for cid in IDS}


def _scope_hits(only, slug):
    """与 _glossary.py v2.23 同口径：字符串或列表，子串匹配。"""
    allowed = [only] if isinstance(only, str) else list(only or [])
    return any(str(a) and str(a) in str(slug) for a in allowed)


def main():
    db = _load()
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    kip = db[IDS[0]] or {}
    issuer = db[IDS[1]] or {}
    residue = db[IDS[2]] or {}

    chk("三条回流契约均落库", all(db[i] for i in IDS))

    # 1. sr «кип»：词边界档命中误用、不误伤合法存量 «екіпа»
    chk("sr 契约收裸词形 кип", "кип" in (kip.get("terms") or []))
    bad = ["Сваки кип јестивих водених животиња",
           "Кип тајландских гајених живих шкампи",
           "Земља и кип су само приказ",
           "санитарни сертификат уз сваки кип"]
    chk("кип 4 处误用全命中",
        all(len(_ban_hits("sr", "кип", s)) == 1 for s in bad))
    chk("кип 不误伤 сопствена екипа",
        len(_ban_hits("sr", "кип", "сопствена екипа ради на пројекту")) == 0)

    # 2. hy/ms 落款：only_slug 只锁本篇、require 收修复后的正形
    chk("issuer only_slug 锁 137 篇",
        issuer.get("only_slug") == SLUG_137)
    req = issuer.get("require") or {}
    chk("issuer hy 正形带尾字母 ն",
        "մաքսային գլխավոր վարչություն" in (req.get("hy") or []))
    chk("issuer ms 正形无 Diraja",
        "Pentadbiran Am Kastam China" in (req.get("ms") or [])
        and all("Diraja" not in x for x in (req.get("ms") or [])))
    chk("issuer 射程不含 148 篇",
        not _scope_hits(issuer.get("only_slug"), SLUG_148))

    # 3. 串篇残留：按篇正则只打上篇专名，不打本篇合法内容
    chk("residue only_slug 锁 137 篇",
        residue.get("only_slug") == SLUG_137)
    chk("residue scope=all 逐块受检", residue.get("scope") == "all")
    pats = (residue.get("forbid_re") or {}).get("*") or []
    chk("residue 恰 3 组通配正则", len(pats) == 3)
    try:
        rx = [re.compile(p) for p in pats]
        chk("residue 3 组正则均可编译", True)
    except re.error:
        rx = []
        chk("residue 3 组正则均可编译", False)

    def hit(s):
        return any(r.search(s) for r in rx)

    for word in ("Namibia", "Namibië", "纳米比亚", "ナミビア",
                 "Намибия", "Nigeria", "Nigéria", "Karas",
                 "whole territory", "repealed", "2014", "939"):
        chk("残留命中 %s" % word, hit(word))
    for word in ("Niger", "尼日尔", "WOAH", "137", "2026",
                 "口蹄疫", "2026 年 9 月 10 日"):
        chk("不误伤 %s" % word, not hit(word))
    chk("residue 射程不含 148 篇",
        not _scope_hits(residue.get("only_slug"), SLUG_148))

    # 4. R1 七条语义契约：落库、锚点、作用域、语向数、极性自碰
    for cid, (anchor, nreq) in R1_SPEC.items():
        tag = cid.split("r1-", 1)[1]
        c = db[cid] or {}
        chk("R1 %s 锚点与作用域" % tag,
            c.get("zh") == anchor and c.get("scope") == "all"
            and c.get("only_slug") == SLUG_R1)
        req = c.get("require") or {}
        chk("R1 %s require %d 语" % (tag, nreq), len(req) == nreq)
        forb = c.get("forbid") or {}
        chk("R1 %s forbid 不与 require 自碰" % tag,
            all(str(fv).casefold() not in str(rv).casefold()
                for fl, fv in forb.items()
                for rl, rv in ((fl, req.get(fl)),) if rv))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("回流契约机理：%d 臂，FAIL %d" % (len(cases), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
