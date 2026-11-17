# -*- coding: utf-8 -*-
"""自检：P34 —— 全角逗号/句号出现在拉丁、阿拉伯、西里尔语向，是翻译工具或编辑器残留。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nFin\uff0c puis rien.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P34", mutate, "全角逗号/句号出现在拉丁、阿拉伯、西里尔语向，是翻译工具或编辑器残留。")]))
