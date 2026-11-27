# -*- coding: utf-8 -*-
"""自检：P82 —— 属名缩写后种加词首字母大写"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    fr = H.lang_file(work, "fr", kind="regulation")
    H.write_body(fr, H.body_of(fr).rstrip("\n")
                 + "\n\n对照学名 P. Lilacinus 已记录。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P82", mutate, "fr 学名缩写大写", "regulation")]))
