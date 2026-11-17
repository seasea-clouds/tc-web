# -*- coding: utf-8 -*-
"""自检：L09 —— 日文混入简体字形"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    ja = H.lang_file(work, "ja")
    H.write_body(ja, H.body_of(ja) + "\n\n他说这样可以。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("L09", mutate, "ja 正文追加简体「说」")]))
