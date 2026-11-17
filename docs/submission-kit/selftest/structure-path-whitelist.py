# -*- coding: utf-8 -*-
"""自检：S10 —— content/ 下塞非 mdx 文件（历史 _blocks.json 事故同型）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    (art / "content" / "_blocks.json").write_bytes(b"{}")


if __name__ == "__main__":
    raise SystemExit(H.main([("S10", mutate, "content/ 下放 _blocks.json")]))
