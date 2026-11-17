# -*- coding: utf-8 -*-
"""自检：I02 —— 缺少封面"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    (art / "images" / art.name / "cover.webp").unlink()


if __name__ == "__main__":
    raise SystemExit(H.main([("I02", mutate, "删掉 cover.webp")]))
