# -*- coding: utf-8 -*-
"""自检：P05 —— 正式商务稿的省略号多为残句或机翻截断，读者会以为话没说完。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nEt ainsi de suite...\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P05", mutate, "正式商务稿的省略号多为残句或机翻截断，读者会以为话没说完。")]))
