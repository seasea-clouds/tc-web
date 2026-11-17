# -*- coding: utf-8 -*-
"""自检：R05 —— 正文不得出现绝对否定表述"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append_zh(work, para):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    _append_zh(work, "资料不齐的批次无法出口，只能退运。")


if __name__ == "__main__":
    raise SystemExit(H.main([("R05", mutate, "zh 出现「无法出口」")]))
