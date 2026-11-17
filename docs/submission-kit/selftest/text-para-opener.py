# -*- coding: utf-8 -*-
"""自检：ST06 —— 段首 AI 连接词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nMoreover, le bureau vérifie chaque envoi avant le départ.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST06", mutate, "fr 段落以 Moreover 开头")]))
