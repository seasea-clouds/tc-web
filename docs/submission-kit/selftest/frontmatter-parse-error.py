# -*- coding: utf-8 -*-
"""自检：F01 —— frontmatter 未闭合"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.drop_fm_close(H.lang_file(work, "fr"))


if __name__ == "__main__":
    raise SystemExit(H.main([("F01", mutate, "删掉 fr 的收尾 ---")]))
