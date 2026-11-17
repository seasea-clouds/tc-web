# -*- coding: utf-8 -*-
"""自检：P72 —— 英文紧凑形残词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLe traitement prend 3 wks en moyenne.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P72", mutate, "fr 残留 wks")]))
