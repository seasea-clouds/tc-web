# -*- coding: utf-8 -*-
"""自检：P07 —— 连续空格来自复制粘贴或表格对齐，渲染时被折叠但会污染 diff 与检索。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nDeux  espaces ici.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P07", mutate, "连续空格来自复制粘贴或表格对齐，渲染时被折叠但会污染 diff 与检索。")]))
