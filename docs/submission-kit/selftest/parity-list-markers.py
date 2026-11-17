# -*- coding: utf-8 -*-
"""自检：P25 —— 列表标记与缩进层级必须与母版一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # fr 第一条 bullet 由短横线换成星号：条目数不变，符号序列变了
    p = H.lang_file(work, "fr")
    lines = H.body_of(p).split("\n")
    for i, ln in enumerate(lines):
        if ln.startswith("- "):
            lines[i] = "* " + ln[2:]
            break
    H.write_body(p, "\n".join(lines))


if __name__ == "__main__":
    raise SystemExit(H.main([("P25", mutate, "fr 列表符号 - 换成 *")]))
