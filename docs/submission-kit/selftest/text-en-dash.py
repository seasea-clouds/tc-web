# -*- coding: utf-8 -*-
"""自检：ST02 —— en dash 未用于数字区间"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLe délai de traitement est de 2 – 4 jours ouvrables.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST02", mutate, "fr 正文插入带空格的 en dash")]))
