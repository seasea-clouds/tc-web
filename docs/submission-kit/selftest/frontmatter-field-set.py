# -*- coding: utf-8 -*-
"""自检：F02 —— frontmatter 多出字段"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.add_fm_line(H.lang_file(work, "fr"), "bogus: x")


if __name__ == "__main__":
    raise SystemExit(H.main([("F02", mutate, "fr 插入 bogus 字段")]))
