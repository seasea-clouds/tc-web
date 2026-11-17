# -*- coding: utf-8 -*-
"""自检：P57 —— 小数/千分位必须符合本语规范"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n现行税率约 9.1 个百分点，按季调整。\n"
FR_BAD = "\nLe taux actuel est de 9.1 points, ajusté chaque trimestre.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def mutate(work):
    # fr 应写小数逗号 9,1：写成 9.1 是本语规范问题（数字本身没错）
    _append(work, "zh", ZH)
    _append(work, "fr", FR_BAD)


if __name__ == "__main__":
    raise SystemExit(H.main([("P57", mutate, "fr 小数逗号写成小数点")]))
