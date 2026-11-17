# -*- coding: utf-8 -*-
"""自检：P36 —— 标识型数字逐块存活"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n监管方式代码 1210 与 9610 分别对应保税电商与直购。\n"
FR = "\nLes codes 1021 et 9610 correspondent au commerce sous douane.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def mutate(work):
    # fr 把母版的 1210 写成 1021：块结构不变，只有一个编码错位
    _append(work, "zh", ZH)
    _append(work, "fr", FR)


if __name__ == "__main__":
    raise SystemExit(H.main([("P36", mutate, "fr 编码 1210 写成 1021")]))
