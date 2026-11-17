# -*- coding: utf-8 -*-
"""自检：P15 —— `fin .` 这种空格来自复制或英文习惯，法语等语向的正字法只在特定标点前留空格。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nLa fin .\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P15", mutate, "`fin .` 这种空格来自复制或英文习惯，法语等语向的正字法只在特定标点前留空格。")]))
