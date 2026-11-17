# -*- coding: utf-8 -*-
"""自检：S05 —— 条目内出现白名单后缀之外的文件。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    (art / "notes.txt").write_text("草稿\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(H.main([("S05", mutate, "条目根放 notes.txt")]))
