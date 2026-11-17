# -*- coding: utf-8 -*-
"""自检：B10 —— em dash 与 en dash 混排时，同一批稿件里会出现两种破折号，排版不统一。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n\u2014 et \u2013\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B10", mutate, "em dash 与 en dash 混排时，同一批稿件里会出现两种破折号，排版不统一。")]))
