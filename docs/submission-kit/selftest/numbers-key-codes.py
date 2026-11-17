# -*- coding: utf-8 -*-
"""自检：P20 —— 从母版抽 `X####-##`（裁定号）与 `####.####`（HS 编码），各语不得丢失。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p) + "\n（依据裁定书 A1234-56。）\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P20", mutate, "从母版抽 `X####-##`（裁定号）与 `####.####`（HS 编码），各语不得丢失。")]))
