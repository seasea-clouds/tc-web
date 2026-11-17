# -*- coding: utf-8 -*-
"""自检：P09 —— 现代韩语正文用谚文；混入汉字（무역准入 这类）是漏译或中文残留。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "ko")
    H.write_body(p, H.body_of(p) + "\n\ubb34\uc5ed\u51c6\u5165 \u6761\u4ef6\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P09", mutate, "现代韩语正文用谚文；混入汉字（무역准入 这类）是漏译或中文残留。")]))
