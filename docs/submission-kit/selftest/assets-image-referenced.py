# -*- coding: utf-8 -*-
"""自检：I06 —— 多出一张未被引用的图"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    src = next((art / "images" / art.name).glob("china*.webp"))
    (art / "images" / art.name / "orphan-shot.webp").write_bytes(src.read_bytes())


if __name__ == "__main__":
    raise SystemExit(H.main([("I06", mutate, "复制一张图但不写引用")]))
