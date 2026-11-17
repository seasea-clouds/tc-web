# -*- coding: utf-8 -*-
"""自检：I04 —— 配图超过 400KB"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    img = next((art / "images" / art.name).glob("china*.webp"))
    img.write_bytes(img.read_bytes() + b"\0" * (500 * 1024))


if __name__ == "__main__":
    raise SystemExit(H.main([("I04", mutate, "给配图追加 500KB 填充")]))
