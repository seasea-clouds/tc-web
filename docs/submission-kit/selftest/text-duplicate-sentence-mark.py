# -*- coding: utf-8 -*-
"""自检：P99 —— 乌尔都语句末标点 U+06D4 不得重复。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "ur")
    H.write_body(p, H.body_of(p) + "\nیہ ضروری ہے۔۔\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P99", mutate, "句末标点不得重复，含乌尔都语 ۔۔。" )]))
