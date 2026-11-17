# -*- coding: utf-8 -*-
"""自检：B06 —— `┌─┐` 一类制表符在移动端与 RTL 语向下必然错位，且屏幕阅读器读成乱码。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n┌───┐\n│ x │\n└───┘\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B06", mutate, "`┌─┐` 一类制表符在移动端与 RTL 语向下必然错位，且屏幕阅读器读成乱码。")]))
