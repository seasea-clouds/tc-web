# -*- coding: utf-8 -*-
"""自检：ST08 —— 其余语向的 AI 套话（句首填充语）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nIl convient de noter que le délai varie selon le port.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST08", mutate, "fr 正文插入 il convient de noter")]))
