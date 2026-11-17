# -*- coding: utf-8 -*-
"""自检：L04 —— 拉丁语向正文混入中文"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    fr = H.lang_file(work, "fr")
    H.write_body(fr, H.body_of(fr) + "\n\n这是中文段落。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("L04", mutate, "fr 正文追加中文整句")]))
