# -*- coding: utf-8 -*-
"""自检：P70 —— 阿拉伯句号误入非 ur 语向"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "ar")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nيتم تقديم الطلب إلكترونيا۔\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P70", mutate, "ar 混入 U+06D4")]))
