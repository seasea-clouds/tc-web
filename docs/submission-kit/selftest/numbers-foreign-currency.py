# -*- coding: utf-8 -*-
"""自检：P32 —— 外币词（euro/yen/рубл/원…）须紧邻数字才算命中，避开同形词误报。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nLe total est 500 euro.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P32", mutate, "外币词（euro/yen/рубл/원…）须紧邻数字才算命中，避开同形词误报。")]))
