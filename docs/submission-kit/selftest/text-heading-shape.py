# -*- coding: utf-8 -*-
"""自检：B02 —— `##标题`（缺空格）不渲染成标题；`####` 及以上在小屏会碎成正文。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n#### 四级标题\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B02", mutate, "`##标题`（缺空格）不渲染成标题；`####` 及以上在小屏会碎成正文。")]))
