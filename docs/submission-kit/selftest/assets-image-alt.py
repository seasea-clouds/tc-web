# -*- coding: utf-8 -*-
"""自检：I08 —— alt 写成占位词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    import re
    p = H.lang_file(work, "en")
    s = p.read_text(encoding="utf-8")
    s = re.sub(r"!\[[^\]]*\]\(", "![image](", s, count=1)
    p.write_text(s, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("I08", mutate, "en 图片 alt 改成 image")]))
