# -*- coding: utf-8 -*-
"""自检：F03 —— 标题形态（分隔符形状）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 标题用「空格-空格」做副标题分隔：列表卡片按 en dash 截断
    p = H.lang_file(work, "fr")
    H.patch_fm(p, "title", "Contrôle des importations - guide pratique")


if __name__ == "__main__":
    raise SystemExit(H.main([("F03", mutate, "fr 标题用 - 作分隔")]))
