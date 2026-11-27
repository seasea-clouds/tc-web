# -*- coding: utf-8 -*-
"""自检：P95 —— 正文成对 ASCII 直双引号"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "en")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + '\n\nHe said "yes" in the notice.\n')


if __name__ == "__main__":
    raise SystemExit(H.main([("P95", mutate, "en 正文 ASCII 直双引号")]))
