# -*- coding: utf-8 -*-
"""自检：S07 —— mdx 落 CRLF（历史假红事故同型）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    p = next((art / "content" / "en").glob("*.mdx"))
    p.write_bytes(p.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))


if __name__ == "__main__":
    raise SystemExit(H.main([("S07", mutate, "en mdx 改 CRLF")]))
