# -*- coding: utf-8 -*-
"""自检：P77 —— 解读段压缩丢层 / 数字锚丢失"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

MARK = "<!-- original -->"


def mutate(work):
    p = H.lang_file(work, "de", kind="regulation")
    body = H.body_of(p)
    head, tail = body.split(MARK, 1)
    H.write_body(p, "K.\n\n" + MARK + tail)


if __name__ == "__main__":
    raise SystemExit(H.main([("P77", mutate, "de 解读段压成一句话",
                              "regulation")]))
