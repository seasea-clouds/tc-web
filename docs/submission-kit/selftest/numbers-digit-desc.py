# -*- coding: utf-8 -*-
"""自检：P47 —— 母版「N 位」的位数必须在译文同块存活"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n正面清单共 1476 个 8 位税号，逐一核对。\n"
FR = "\nLa liste positive compte 1476 codes à huit chiffres, à vérifier.\n"
FR_BAD = "\nLa liste positive compte 1476 codes, à vérifier un par un.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def mutate(work):
    # fr 写成「1476 codes」把「8 位」整个丢掉：数字全对，描述位消失
    _append(work, "zh", ZH)
    _append(work, "fr", FR_BAD)


if __name__ == "__main__":
    raise SystemExit(H.main([("P47", mutate, "fr 丢掉「8 位」描述位")]))
