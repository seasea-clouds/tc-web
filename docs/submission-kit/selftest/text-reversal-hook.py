# -*- coding: utf-8 -*-
"""自检：ST05 —— 反转钩子句式"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n看似复杂，实则简单。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST05", mutate, "zh 正文插入 看似…实则")]))
