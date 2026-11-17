# -*- coding: utf-8 -*-
"""自检：概念对开火准入（`tools/pair_open.py` 的 decide 纯函数）。

v440 之前，编码型概念对（归类/税号）的准入只散在两处文字里：v439 说「看
试跑不看召回」，v437 说「召回是定 mode 的唯一依据」。两条口径合起来才是
准入条件，但没有任何代码同时表达它们——单阈值工具（family_import）一定会
开错边：税号在译文里常只写「编码」，召回天然到不了 0.70；归类侧族薄时
`hit_a*2 < zh_a` 会把「缺屈折」读成「被吸收」。

四条断言：
  ① 两侧都过线 + 在试跑放行名单 → check；
  ② 任一侧不过线 → unverified，且理由**点名该侧**（不能只报「未达标」）；
  ③ 该语向在 audit TSV 里缺行 → 整格跳过（v433 教训：缺测 ≠ 证据 0 篇）；
  ④ 召回达标但不在试跑放行名单 → 仍 unverified（召回证不了不误伤）。
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
TOOL = os.path.join(KIT, "tools", "pair_open.py")

_spec = importlib.util.spec_from_file_location("pair_open", TOOL)
PO = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(PO)

FAMILY = {"归类": {"de": ["Einreihung"], "fr": ["classement"], "es": ["clasificación"]},
          "税号": {"de": ["Warennummer"], "fr": ["code tarifaire"], "es": []}}
# 语料级召回（TSV total 列）：de 双侧达标、fr 税号偏低、es 缺 税号 行
AUDIT = {("归类", "de"): (0.90, 18), ("税号", "de"): (0.75, 13),
         ("归类", "fr"): (0.81, 18), ("税号", "fr"): (0.33, 13),
         ("归类", "es"): (0.93, 18)}
GATE = {"归类": 0.50, "税号": 0.40}


def main():
    rows = {r["lang"]: r for r in PO.decide(FAMILY, AUDIT, GATE, {"de", "fr"})}

    ok1 = rows["de"]["mode"] == "check"
    ok2 = (rows["fr"]["mode"] == "unverified" and "税号" in rows["fr"]["why"]
           and "归类" not in rows["fr"]["why"])
    ok3 = rows["es"]["mode"] is None and "未覆盖" in rows["es"]["why"]
    rows_nc = {r["lang"]: r for r in PO.decide(FAMILY, AUDIT, GATE, set())}
    ok4 = rows_nc["de"]["mode"] == "unverified" and "试跑" in rows_nc["de"]["why"]

    fails = 0
    for label, ok in (("① 双侧达标＋试跑放行 → check", ok1),
                      ("② 单侧不达标 → 点名该侧", ok2),
                      ("③ TSV 缺行 → 整格跳过", ok3),
                      ("④ 未在试跑名单 → 不开火", ok4)):
        print("  %-4s %-30s %s" % ("OK" if ok else "FAIL", label,
                                   "" if ok else "实测：%r" % (rows.get(
                                       label[-4:].strip(), {}),)))
        fails += 0 if ok else 1
    print("概念对开火准入：4 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
