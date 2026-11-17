# -*- coding: utf-8 -*-
"""自检：词族形态扩展的**派生保护**（工具级臂，`selftest --kit` 才跑）。

为什么必须有：`family_expand` 的产出直接进 `concept-family`，而词族是
「哪些写法算这个概念」的定义。扩张错一个词形，等于给该语向永久植入一个
错判——且它不会报错，只会让 P75 的计数虚高（假阴性）或把无关词算进族。

v426 实证：de `Rechnung`（发票）剥掉名词化后缀 `-ung` 得词干 `rechn`，
再加 `-en/-er/-et` 产出 `rechnen`（计算）、`rechner`（计算器）、`rechnet`
（计算），三个词在语料里都有实频，一路进了已开判据的族。

三个断言：
  ① 名词化后缀不得被剥掉（Rechnung → 词干仍是 rechnung）；
  ② 派生后缀不得被追加（factura 不得生成 facturación）；
  ③ 屈折仍要正常产出（Rechnung → rechnungen 必须还在候选里）。
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
_spec = importlib.util.spec_from_file_location(
    "fx", os.path.join(KIT, "tools", "family_expand.py"))
FX = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(FX)


def _cands(form, lg):
    return {h + st + s for st, h, s in FX.variants(form, lg, 4)}


def main():
    de = _cands("Rechnung", "de")
    es = _cands("factura", "es")
    checks = [
        ("① 不剥名词化后缀（无 rechnen/rechner）",
         not ({"rechnen", "rechner", "rechnet"} & {c.lower() for c in de})),
        ("② 不追加派生后缀（无 facturación）",
         "facturación" not in {c.lower() for c in es}),
        ("③ 屈折仍产出（rechnungen 在候选里）",
         "rechnungen" in {c.lower() for c in de}),
        # v441：`*` 结尾是复合词词干，本身即通配。若被当普通词形展开，
        # 回写时星号会被抹掉，日耳曼语的复合形重新全部漏判——静默失效。
        ("④ 星号词干不参与展开", FX.variants("Einreihungs*", "de", 4) == []),
    ]
    fails = 0
    for label, ok in checks:
        print("  %-4s %-38s %s" % ("OK" if ok else "FAIL", label,
                                   "" if ok else "实测不符"))
        fails += 0 if ok else 1
    print("词族形态扩展：4 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
