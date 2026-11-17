# -*- coding: utf-8 -*-
"""自检：P48 —— 万亿（10^12）不得写成短级差语言的 10^18 词形"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n全年跨境电商规模约 0.43 万亿元。\n"
FR_BAD = "\nLe volume annuel atteint 0,43 trillion de yuans.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def mutate(work):
    # 数字 0,43 原样，单位被放大到 10^18：只有级差判据能看见
    _append(work, "zh", ZH)
    _append(work, "fr", FR_BAD)


if __name__ == "__main__":
    raise SystemExit(H.main([("P48", mutate, "fr 万亿写成 trillion")]))
