# -*- coding: utf-8 -*-
"""自检：P100 —— 括号内拉丁缩写不得写成 ( NMPA )。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "en")
    H.write_body(p, H.body_of(p) + "\nThe ( NMPA ) notice applies.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P100", mutate, "括号内拉丁缩写不得留内侧空格，应写 (NMPA)。")]))
