# -*- coding: utf-8 -*-
"""自检：P16 —— `**` 奇数个或括号不成对，通常是漏改、截断或替换脚本吃掉半个符号。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n\u00c0 noter( sans fermeture.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P16", mutate, "`**` 奇数个或括号不成对，通常是漏改、截断或替换脚本吃掉半个符号。")]))
