# -*- coding: utf-8 -*-
"""自检：B11 —— 行内两个以上 emoji 在部分客户端被解析成项目符号列表，语义错乱。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n\U0001F600 \U0001F600 \U0001F600\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B11", mutate, "行内两个以上 emoji 在部分客户端被解析成项目符号列表，语义错乱。")]))
