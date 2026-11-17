# -*- coding: utf-8 -*-
"""自检：P33 —— `$`/`¥`/`€` 与 USD/CNY 一律改成本土文字写法（5000 元 / 50 美元）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nLe total est $500.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P33", mutate, "`$`/`¥`/`€` 与 USD/CNY 一律改成本土文字写法（5000 元 / 50 美元）。")]))
