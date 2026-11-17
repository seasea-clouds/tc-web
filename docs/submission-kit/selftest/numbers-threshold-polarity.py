# -*- coding: utf-8 -*-
"""自检：P59 —— 「N% 以上」含本数，不得写成严格大于"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n区内增值率不低于 10% 以上的企业适用简易申报。\n"
FR_BAD = "\nLes entreprises dont la valeur ajoutée dépasse plus de 10 % "
FR_BAD += "peuvent déclarer simplement.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def mutate(work):
    # 母版「10% 以上」＝≥10；fr 写成 plus de 10 %（严格大于），漏掉恰为 10 的一档
    _append(work, "zh", ZH)
    _append(work, "fr", FR_BAD)


if __name__ == "__main__":
    raise SystemExit(H.main([("P59", mutate, "fr 把「以上」写成 plus de")]))
