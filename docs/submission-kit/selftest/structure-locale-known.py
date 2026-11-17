# -*- coding: utf-8 -*-
"""自检：S03 —— content/ 下出现未注册语言码。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    src = next((art / "content" / "en").glob("*.mdx"))
    dst = art / "content" / "xx"
    dst.mkdir()
    (dst / src.name).write_bytes(src.read_bytes())


if __name__ == "__main__":
    raise SystemExit(H.main([("S03", mutate, "多出 content/xx/ 目录")]))
