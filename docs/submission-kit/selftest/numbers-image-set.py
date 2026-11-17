# -*- coding: utf-8 -*-
"""自检：P03 —— 少一张图或多一张图都会让该语向的图注与正文对应关系断掉。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    lines = H.body_of(p).split("\n")
    for i, ln in enumerate(lines):
        if ln.startswith("!["):
            del lines[i]
            break
    H.write_body(p, "\n".join(lines))


if __name__ == "__main__":
    raise SystemExit(H.main([("P03", mutate, "少一张图或多一张图都会让该语向的图注与正文对应关系断掉。")]))
