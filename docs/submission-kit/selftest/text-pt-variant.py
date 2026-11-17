# -*- coding: utf-8 -*-
"""自检：P53 —— 葡语变体同篇混用"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 欧葡 registo 与巴葡 registro 同篇并存
    p = H.lang_file(work, "pt")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nO registo é feito no registo local; o registro fica "
                   "arquivado.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P53", mutate, "pt 混用 registo/registro")]))
