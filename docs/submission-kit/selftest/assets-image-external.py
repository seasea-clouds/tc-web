# -*- coding: utf-8 -*-
"""自检：I07 —— 正文图片用外链"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    import re
    p = H.lang_file(work, "en")
    s = p.read_text(encoding="utf-8")
    s = re.sub(r"!\[([^\]]*)\]\(/images/blog/[^)]+\)",
               r"![\1](https://cdn.example.com/x.webp)", s, count=1)
    p.write_text(s, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("I07", mutate, "en 正文图片 URL 改成外链")]))
