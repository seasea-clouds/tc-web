# -*- coding: utf-8 -*-
"""自检：P01 —— 同一张图重复引用会让读者以为有两张图，且 P18 顺序比对随之失真。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    b = H.body_of(p)
    first = [ln for ln in b.split("\n") if ln.startswith("![")][0]
    H.write_body(p, b + "\n" + first + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P01", mutate, "同一张图重复引用会让读者以为有两张图，且 P18 顺序比对随之失真。")]))
