# -*- coding: utf-8 -*-
"""自检：S06 —— 单语 mdx 超过 100 KB。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    p = next((art / "content" / "en").glob("*.mdx"))
    p.write_bytes(p.read_bytes() + b"\n\n" + b"x" * (110 * 1024) + b"\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("S06", mutate, "en mdx 追加 110KB")]))
