# -*- coding: utf-8 -*-
"""自检：S02 —— 缺语向目录"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    import shutil
    d = H.article_root(work, "blog") / "content" / "si"
    shutil.rmtree(d)


if __name__ == "__main__":
    raise SystemExit(H.main([("S02", mutate, "删掉 content/si 目录")]))
