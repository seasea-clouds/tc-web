# -*- coding: utf-8 -*-
"""工具级自检：新公告拉丁学名成分登记闭环（v400 回流 / REG47）。

`_` 前缀：`latin-taxon` 是 `data/glossary.db` 的受控词表，没有独立插件文件，
按 A6/A7 不能占用正名臂；由 `submit.py selftest --kit` 单独计数。

覆盖 REG47（107 号孟加拉鲜食菠萝蜜）实测缺陷：公告第五部分列 10 种检疫性
有害生物，其中 7 个属名（Indarbela / Glyphodes / Milviscutulus / Ochyromera /
Phyllosticta / Rhizopus / Uredo）与 8 个种加词此前不在 latin-taxon 表内。
P30 只在「属名命中词表」时按结构剥离整段学名，故 zh 母版把 `artocarpi`
（Rhizopus artocarpi / Uredo artocarpi 各一次）计为「夹用英文原词」报 warning。
词表已有 388 个学名成分，属同一「新公告新属名」缺陷族，故按族扩表
而非单篇改稿或按篇放行。

双向断言：① 15 个新成分在表内且旧属名族仍在；② 登记后整段学名不报残留；
③ 移除 7 个新属名后同段文本重新报红（证明防线确实依赖登记）；
④ 未登记的形近属名仍报红（防止整表放开）。只读真实词表与共享匹配函数，
不改线上契约、不建官方尺副本。
"""
import os
import sqlite3
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from plugins._lang import latin_residue  # noqa: E402

DB = os.path.join(_KIT, "data", "glossary.db")

NEW_GENERA = ("indarbela", "glyphodes", "milviscutulus", "ochyromera",
              "phyllosticta", "rhizopus", "uredo")
NEW_EPITHETS = ("carambolae", "umbrosa", "tetraonis", "caesalis",
                "mangiferae", "artocarp", "artocarpina", "artocarpi")
OLD_GENERA = ("artocarpus", "bactrocera", "planococcus")

# 官方第五部分第（9）（10）项：两个不同属、同一种加词 → 词频 2
TEXT = "（9）木菠萝软腐病 Rhizopus artocarpi。（10）壳锈菌属一种 Uredo artocarpi。"
FAKE = "（9）木菠萝软腐病 Xyzus artocarpi。（10）壳锈菌属一种 Xyzus artocarpi。"


def _taxa_from_db():
    conn = sqlite3.connect(DB)
    try:
        return frozenset(r[0] for r in conn.execute(
            "select value from lexicons where id='latin-taxon' and scope='global'"))
    finally:
        conn.close()


def main():
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    taxa = _taxa_from_db()

    # ① 按缺陷族登记（全库通用学名成分，不是按篇白名单）
    chk("latin-taxon 登记 7 个新属名", all(g in taxa for g in NEW_GENERA))
    chk("latin-taxon 登记 8 个新种加词", all(e in taxa for e in NEW_EPITHETS))
    chk("同类旧属名族仍在表内", all(g in taxa for g in OLD_GENERA))

    # ② 结构剥离生效：整段学名不进 P30 残留词频
    res = latin_residue(TEXT, 1, taxa=taxa)
    chk("登记后 artocarpi 不再报红", "artocarpi" not in res)

    # ③ 负向对照：抽掉 7 个新属名，同一段文本应重新报红
    stripped = frozenset(w for w in taxa if w not in NEW_GENERA)
    res_without = latin_residue(TEXT, 1, taxa=stripped)
    chk("未登记新属名时同段文本报红（>=2 次）",
        res_without.get("artocarpi", 0) >= 2)

    # ④ 形近但未登记的属名仍受判据约束
    res_fake = latin_residue(FAKE, 1, taxa=taxa)
    chk("未登记形近属名 Xyzus 仍报红", res_fake.get("artocarpi", 0) >= 2)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("新公告学名登记闭环：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
