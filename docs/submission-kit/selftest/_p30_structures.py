# -*- coding: utf-8 -*-
"""工具级自检：P30 的法定拉丁串按**结构**豁免，不按篇目。

`_` 前缀：本臂验的是「结构识别」这条判据通路（策略库 latin-taxon 词表 →
plugins/_lang.py 剥离链），没有对应插件，按 A6/A7 不能占用正名臂；
由 `submit.py selftest --kit` 单独计数。

背景：2026-11-15 之前的实现是 lexicons 表 scope=article 的 480 条逐词放行
（「这一篇出现这 400 个词就放行」）。实测那 480 条没有一条是篇目特有：
学名成分是词类事实，缩写全库通用。机制已整层撤除，改由结构判据承担。

八臂，正负各半——只验「能剥」会掩盖剥过头：
  1. 学名「属名 + 种加词 + 命名人」整段剥离；
  2. 带 var./括号异名的长学名整段剥离（Hand.-Mazz. 形态）；
  3. 属名不在词表的大写词组**不剥离**（Bonded warehouse 是真残留）；
  4. 法定双语名括号（内含学名）整段剥离，英文俗名一并算官方标注；
  5. 不含学名的括号**不剥离**（Annex 3 里的英文照旧受检）；
  6. 分类学阶元名（Fabaceae）剥离；同形普通词（Sales）不剥；
  7. 官方议定书名 from … to China 整段剥离（国名不是残留）；
  8. 药材拼音不因结构规则被误剥（honghua 仍需词表或改稿处理）。
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core import db as _db                                       # noqa: E402
from plugins._lang import latin_residue                           # noqa: E402
from plugins._lexicon import shape_taxon                          # noqa: E402

_PV = _db.current_policy(None, _KIT)
_TAXA = shape_taxon(_PV.lexicons.get("latin-taxon") or ())


def _words(text):
    return set(latin_residue(text, 1, allow=frozenset(), taxa=_TAXA))


def main():
    cases = []

    def add(name, ok):
        cases.append((name, bool(ok)))

    # 1 学名整段剥离
    w = _words("высушаная расліна Abrus cantoniensis Hance сямейства бабовых")
    add("学名 Abrus cantoniensis Hance 剥离", not (w & {"abrus", "cantoniensis", "hance"}))
    add("学名两侧正文保留", "высушаная" not in w)

    # 2 var. / 括号异名 / Hand.-Mazz.
    w = _words("Paris polyphylla Smith var. yunnanensis (Franch.) Hand.-Mazz. насенне")
    add("var. 与括号异名整段剥离",
        not (w & {"paris", "polyphylla", "smith", "var", "yunnanensis",
                  "franch", "hand", "mazz"}))
    add("Hand.-Mazz. 之后的正文保留", "насенне" not in w)

    # 3 负向：非学名大写词组不剥
    w = _words("Вялікая Bonded warehouse 台账")
    add("Bonded warehouse 不剥（真残留）", {"bonded", "warehouse"} <= w)
    w = _words("Warehouse management system 简介")
    add("Warehouse management system 不剥", {"warehouse", "management"} <= w)

    # 4/5 双语名括号
    w = _words("Плод (الاسم العلمي Prunus armeniaca، الاسم الإنجليزي Apricot)")
    add("双语名括号整段剥离", not (w & {"prunus", "armeniaca", "apricot"}))
    w = _words("（详见 Annex 3 的说明）")
    add("无学名括号不剥", "annex" in w)

    # 6 分类学阶元名
    w = _words("Fabaceae ընտանիքի բույս")
    add("科名 Fabaceae 剥离", "fabaceae" not in w)
    w = _words("Sales report 目录")
    add("普通词 Sales 不剥", "sales" in w)

    # 7 官方议定书名
    w = _words("Protocol of Phytosanitary Requirements for Export of Fresh "
               "Berries from Kyrgyz Republic to China, and is free from pests")
    add("议定书名整段剥离（国名不算残留）",
        not (w & {"protocol", "kyrgyz", "republic", "china"}))

    # 8 药材拼音不因结构被误剥
    w = _words("Maqianzi fen: αποξηραμένος ώριμος σπόρος του φυτού Strychnos nux-vomica")
    add("药材拼音不被结构规则吞掉", {"maqianzi", "fen"} <= w)
    add("其后的学名照旧剥离", not (w & {"strychnos", "vomica"}))

    # 9/10 连续英文整句：≥6 词按引用剥，5 词仍是残留
    w = _words("Chia seed to be exported to China shall be packed using clean "
               "and unused materials free of toxic and harmful substances")
    add("≥6 词法定英文声明剥离", not (w & {"chia", "seed", "packed", "materials"}))
    w = _words("هنا paid media acquisitio module seeding في النص")
    add("5 词英文片段仍报（不当整句放过）",
        {"paid", "media", "module", "seeding"} <= w)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("P30 结构豁免：%d 臂，FAIL %d（taxon 词表 %d 词）"
          % (len(cases), fails, len(_TAXA)))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
