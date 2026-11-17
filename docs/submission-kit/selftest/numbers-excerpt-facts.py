# -*- coding: utf-8 -*-
"""自检：P55 —— 母版摘要里的份额数（69%）与规模数，各语摘要都不得丢。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.patch_fm(p, "excerpt", H.fm_value(p, "excerpt") + " 规模 777 亿元。")


if __name__ == "__main__":
    raise SystemExit(H.main([("P55", mutate, "母版摘要里的份额数（69%）与规模数，各语摘要都不得丢。")]))
