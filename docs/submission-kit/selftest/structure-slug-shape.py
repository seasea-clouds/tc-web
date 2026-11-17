# -*- coding: utf-8 -*-
"""自检：S13 —— slug 形状与最短长度。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    art.rename(art.parent / "Ab")


if __name__ == "__main__":
    raise SystemExit(H.main([("S13", mutate, "slug 改成大写两字符")]))
