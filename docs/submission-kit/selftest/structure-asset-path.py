# -*- coding: utf-8 -*-
"""自检：S04 —— mdx 文件名漂移（<slug>-v2.mdx）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    p = next((art / "content" / "en").glob("*.mdx"))
    p.rename(p.with_name(p.stem + "-v2.mdx"))


if __name__ == "__main__":
    raise SystemExit(H.main([("S04", mutate, "en mdx 改名成 <slug>-v2.mdx")]))
