# -*- coding: utf-8 -*-
"""自检：I05 —— 正文图片路径少了 blog 段"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "en")
    s = p.read_text(encoding="utf-8")
    slug = H.article_root(work, "blog").name
    s = s.replace("/images/blog/%s/" % slug, "/images/%s/" % slug, 1)
    p.write_text(s, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("I05", mutate, "en 正文图片路径改成 /images/<slug>/x.webp")]))
