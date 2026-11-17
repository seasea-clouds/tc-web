# -*- coding: utf-8 -*-
"""自检：F10 —— mdx 落非法 UTF-8 字节。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    p = next((art / "content" / "en").glob("*.mdx"))
    p.write_bytes(p.read_bytes() + b"\n\xff\xfe broken\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("F10", mutate, "en mdx 尾部写非法字节")]))
