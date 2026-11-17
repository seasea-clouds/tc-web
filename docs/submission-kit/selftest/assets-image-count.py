# -*- coding: utf-8 -*-
"""自检：W03 —— 配图超过 6 张"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    src = next((art / "images" / art.name).glob("china*.webp"))
    for k in range(6):
        (art / "images" / art.name / ("extra-shot-%d.webp" % k)).write_bytes(
            src.read_bytes())


if __name__ == "__main__":
    raise SystemExit(H.main([("W03", mutate, "再复制 6 张图进 images/")]))
