# -*- coding: utf-8 -*-
"""工具级自检：审计回流术语契约的射程与匹配机理（2026-11-13 起）。

`_` 前缀：契约本身没有独立插件文件（分别由 P43 glossary-banned-words 与
S08 glossary-term-presence 执行），按 A6/A7 不能占用正名臂；由
`submit.py selftest --kit` 单独计数。

覆盖五条审计回流契约（1–3 当初只在 tmp/ 注入脚本里验过、后补进常驻
回归；4 为 REG213 阶段 5 新回流、5 为 REG244 阶段 5 新回流，随回流一并
落臂）：
  1. banned:reg34-sr-kip-batch —— «кип» 词边界档不得误伤 «ек**ип**а»；
  2. body:reg36-issuer-hy-ms-full —— only_slug 收窄 + hy/ms 落款正形；
  3. body:reg36-cross-article-residue —— 按篇禁用正则命中上篇专名、
     不误伤本篇合法的 «Niger» / «尼日尔» / 文号与年份。
  4. body:reg213-cert-lang-chinese-form —— 证书语言条款「中文」必须
     译为中文语言词形、不得替换成读者本国语言名（reg22 教训沿袭；
     2026-11-21 REG213 阶段 5 回流），require 锁 47 语「中文语言词＋
     英文语言词」配对词形。
  5. body:reg244-131-trio-signature-forms —— 废止类公告落款三机关
     （海关总署/商务部/国家疾控局）按篇锁 47 语落款整行，锚=zh 母版
     落款块（S08 按块序号定位，require 必须与锚同块——锚不能锚在
     别的句上），防改稿把三机关名换成简称或语序漂移
     （2026-11-21 REG244 阶段 5 回流）。

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
from plugins._glossary import _ban_hits, _req_hit             # noqa: E402

SLUG_137 = "gacc-announcement-137-niger-animal-disease-ban"
SLUG_148 = "gacc-announcement-148-namibia-fmd"
SLUG_R1 = "eight-metrics-china-market-entry"
SLUG_213 = "gacc-announcement-159-norway-wild-aquatic-products"
CID_213 = "body:reg213-cert-lang-chinese-form"
ANCHOR_213 = "证书至少用中文、英文印制，填写证书时英文为必选语言"
SLUG_244 = "gacc-announcement-131-repeal-old-sacks-import-ban"
CID_244 = "body:reg244-131-trio-signature-forms"
ANCHOR_244 = "海关总署 商务部 国家疾控局"
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
       "body:reg36-cross-article-residue", CID_213, CID_244) + tuple(R1_SPEC)


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

    chk("%d 条回流契约均落库" % len(IDS), all(db[i] for i in IDS))

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

    # 5. reg213 证书语言：only_slug 锁本篇；require 47 语全显式；
    #    正形命中（I05 大小写不敏感子串口径），读者语言替换/漏译不满足
    cert = db[CID_213] or {}
    chk("cert-lang 锚点与作用域",
        cert.get("zh") == ANCHOR_213 and cert.get("scope") == "all"
        and cert.get("only_slug") == SLUG_213)
    req = cert.get("require") or {}
    chk("cert-lang require 47 语全显式",
        len(req) == 47 and "*" not in req
        and all(str(v).strip() for v in req.values()))
    chk("cert-lang 无 forbid 极性",
        not (cert.get("forbid") or cert.get("forbid_re")))
    chk("cert-lang 射程不含 98 非洲同类篇",
        not _scope_hits(cert.get("only_slug"),
                        "gacc-announcement-98-africa-wild-aquatic-products"))
    pos = {"en": "The certificate must be printed at least in Chinese and English",
           "ja": "証明書は少なくとも中国語及び英語で印刷し",
           "ko": "증명서는 최소한 중국어와 영어로 인쇄하며",
           "vi": "in ít nhất bằng tiếng Trung và tiếng Anh"}
    neg = {"en": "The certificate must be printed at least in English",
           "ja": "証明書は少なくとも日本語及び英語で印刷し",
           "ko": "증명서는 최소한 한국어와 영어로 인쇄하며",
           "vi": "in ít nhất bằng tiếng Việt và tiếng Anh"}
    for lg, s in pos.items():
        chk("cert-lang %s 正形命中" % lg, _req_hit(req[lg], s, cert, lg))
    for lg, s in neg.items():
        chk("cert-lang %s 替换词形不满足" % lg, not _req_hit(req[lg], s, cert, lg))

    # 6. reg244 落款三机关：only_slug 锁本篇；require 47 语全显式整行；
    #    简称/缩写落款不满足；射程不含 85/235 同类废止篇
    trio = db[CID_244] or {}
    chk("trio 锚点与作用域",
        trio.get("zh") == ANCHOR_244 and trio.get("scope") == "all"
        and trio.get("only_slug") == SLUG_244)
    req = trio.get("require") or {}
    chk("trio require 47 语全显式",
        len(req) == 47 and "*" not in req
        and all(str(v).strip() for v in req.values()))
    chk("trio 无 forbid 极性",
        not (trio.get("forbid") or trio.get("forbid_re")))
    for sib in ("gacc-announcement-139-repeal-export-processing-zone-waste",
                "gacc-mee-announcement-120-repeal-import-waste-inspection-notice"):
        chk("trio 射程不含 %s" % sib[-9:], not _scope_hits(trio.get("only_slug"), sib))
    treq = trio.get("require") or {}
    # _req_hit(needle=require, hay=正文)：hay 用「日期行+落款整行+封印」的
    # 带上下文正文（I05 子串口径），neg 用简称落款正文（应不满足）
    neg_hay = {"en": "Signed 1 September 2026. GACC, MOFCOM and NDC. Official seal.",
               "ja": "2026年9月1日付。税関総署・商務省・国家疾病予防制御局。官印。",
               "el": "1 Σεπτεμβρίου 2026. Τελωνεία, Υπουργείο Εμπορίου, ΕΘΕΠΝ. Σφραγίδα.",
               "ar": "1 سبتمبر 2026. الجمارك ووزارة التجارة وإدارة الأمراض. الختم."}
    for lg in ("en", "ja", "el", "ar"):
        hay_pos = "Signed 1 September 2026. %s Official seal." % treq[lg]
        chk("trio %s 正形命中" % lg, _req_hit(treq[lg], hay_pos, trio, lg))
        chk("trio %s 简称落款不满足" % lg, not _req_hit(treq[lg], neg_hay[lg], trio, lg))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("回流契约机理：%d 臂，FAIL %d" % (len(cases), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
