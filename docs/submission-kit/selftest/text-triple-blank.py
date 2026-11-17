# -*- coding: utf-8 -*-
"""自检：P13 —— 三连空行会把后续内容切成新块，P21–P27 的块对齐判据随之错位。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n\n\n\nFin.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P13", mutate, "三连空行会把后续内容切成新块，P21–P27 的块对齐判据随之错位。")]))
