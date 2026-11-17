# -*- coding: utf-8 -*-
"""自检：F08 —— reference 用 http 链接"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    s = p.read_text(encoding="utf-8")
    p.write_text(s.replace("https://", "http://", 1),
                 encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("F08", mutate, "fr references 的 https 改成 http")]))
