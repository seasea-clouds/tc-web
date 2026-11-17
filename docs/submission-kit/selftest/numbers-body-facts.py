# -*- coding: utf-8 -*-
"""自检：P04 —— 从母版正文抽 ≥1000 的整数与小数，各语都必须在正文里出现（含单位换算）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p) + "\n（本期合计 98765 元。）\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P04", mutate, "从母版正文抽 ≥1000 的整数与小数，各语都必须在正文里出现（含单位换算）。")]))
