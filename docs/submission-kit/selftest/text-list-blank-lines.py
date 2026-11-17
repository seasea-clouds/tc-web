# -*- coding: utf-8 -*-
"""自检：B07 —— 列表项之间插空行会把一个列表拆成多个，编号重新从 1 开始。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n- 甲\n\n- 乙\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B07", mutate, "列表项之间插空行会把一个列表拆成多个，编号重新从 1 开始。")]))
