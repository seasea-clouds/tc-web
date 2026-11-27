# -*- coding: utf-8 -*-
"""工具级自检：法定缩写（疫病 PPR / 技术 QR）的拉丁放行登记闭环（v372、v465 回流）。

`_` 前缀：`latin-allow` 是 `data/glossary.db` 的受控词表，没有独立插件文件，
按 A6/A7 不能占用正名臂；由 `submit.py selftest --kit` 单独计数。

覆盖 REG41（116 号哈萨克斯坦动物制品）实测缺陷：公告列明「小反刍兽疫」，
各语向按 SPEC 统一括注 WOAH 法定缩写 PPR。P30 在非拉丁语向 hy/ka 把
`PPR` 计为「夹用英文原词」报 warning。词表此前已含 GAP / IPM / ISPM /
GACC / FTD 等同类缩写，属同一缺陷族，故按族扩表而非单篇改稿。

双向断言：① 词表登记 ppr；② 放行集生效时 PPR 不再报；③ 去掉 ppr 后
同一段文本重新报红（证明防线确实依赖这条登记）；④ 未登记的形近缩写仍报红。
v465 增 QR（REG91 实录）：海关公告里的「二维码」在 ru/uk/be 等西里尔语向写作
`QR-код` / `QR код`，P30 报 qr(3)。QR 与 GAP/CIQ/PPR 同属受控技术缩写族，
按族扩表并补同一套双向断言，不按单篇放开。
只读真实词表与共享匹配函数，不改线上契约、不建官方尺副本。
"""
import os
import sqlite3
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from plugins._lang import latin_residue  # noqa: E402

DB = os.path.join(_KIT, "data", "glossary.db")
HY_TEXT = "Հիվանդություն (PPR)։ Այլ (PPR) դեպք։"
HY_FAKE = "Հիվանդություն (ZZQ)։ Այլ (ZZQ) դեպք։"
RU_TEXT = "На бланке указан код QR. Считайте QR-код и проверьте данные."
RU_FAKE = "На бланке указан код ZX. Считайте ZX-код и проверьте данные."


def _allow_from_db():
    conn = sqlite3.connect(DB)
    try:
        return frozenset(r[0] for r in conn.execute(
            "select value from lexicons where id='latin-allow' and scope='global'"))
    finally:
        conn.close()


def main():
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    allow = _allow_from_db()

    # ① 按缺陷族登记（全库通用缩写，不是按篇白名单）
    chk("latin-allow 全库登记 ppr", "ppr" in allow)
    chk("同类缩写族仍在表内（GAP/IPM/ISPM/GACC）",
        all(w in allow for w in ("gap", "ipm", "ispm", "gacc")))

    # ② 放行集生效：hy 正文两处 PPR 不报
    res = latin_residue(HY_TEXT, 1, allow=allow)
    chk("登记后 PPR 不进 P30 残留词频", "ppr" not in res)

    # ③ 负向对照：去掉这一行，同一段文本应重新报红
    stripped = frozenset(w for w in allow if w != "ppr")
    res_without = latin_residue(HY_TEXT, 1, allow=stripped)
    chk("未登记 ppr 时同段文本报红（>=2 次）", res_without.get("ppr", 0) >= 2)

    # ④ 形近但未登记的缩写仍受判据约束（防止整表放开）
    res_fake = latin_residue(HY_FAKE, 1, allow=allow)
    chk("未登记形近缩写 ZZQ 仍报红", res_fake.get("zzq", 0) >= 2)

    # ⑤ v465：技术缩写 QR 同族登记 + 西里尔语向双向断言
    chk("latin-allow 全库登记 qr", "qr" in allow)
    chk("技术缩写族在位（CIQ/GACC/GAP/IPM）",
        all(w in allow for w in ("ciq", "gacc", "gap", "ipm")))
    chk("登记后 ru 的 QR 不进 P30 残留词频",
        "qr" not in latin_residue(RU_TEXT, 1, allow=allow))
    ru_stripped = frozenset(w for w in allow if w != "qr")
    chk("未登记 qr 时 ru 同段文本报红",
        latin_residue(RU_TEXT, 1, allow=ru_stripped).get("qr", 0) >= 1)
    chk("未登记形近缩写 ZX 仍报红",
        latin_residue(RU_FAKE, 1, allow=allow).get("zx", 0) >= 1)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("法定缩写放行闭环：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
