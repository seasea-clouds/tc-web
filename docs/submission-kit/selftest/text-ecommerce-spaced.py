# -*- coding: utf-8 -*-
"""自检：P39 —— e- 前缀被空格拆开"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 「e commerce」应为 e-commerce
    p = H.lang_file(work, "de")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nWir nutzen e commerce und e handel taeglich.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P39", mutate, "de 写 e commerce")]))
