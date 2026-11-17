# -*- coding: utf-8 -*-
"""自检：B01 —— 站点渲染时 # 会被当成页面标题，与文章标题打架、SEO 结构错乱。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n# 一级标题\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B01", mutate, "站点渲染时 # 会被当成页面标题，与文章标题打架、SEO 结构错乱。")]))
