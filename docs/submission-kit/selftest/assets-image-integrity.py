# -*- coding: utf-8 -*-
"""自检：I01 —— 图片载荷被截断"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    img = next((art / "images" / art.name).glob("*.webp"))
    img.write_bytes(img.read_bytes()[:20])


if __name__ == "__main__":
    raise SystemExit(H.main([("I01", mutate, "把配图截断成 20 字节")]))
