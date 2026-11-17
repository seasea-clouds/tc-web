# -*- coding: utf-8 -*-
"""自检：R24 —— 法规中文母版禁用半角括号中文序号"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 母版把「（一）」写成半角：排版与逐块对齐都会与全角版不同形，
    # 且 R22 / parity-list-markers 都不接这种形态，必须在母版阶段拦住。
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n(一) 探针层级标题写成半角括号。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("R24", mutate, "zh 母版出现半角中文序号")]))
