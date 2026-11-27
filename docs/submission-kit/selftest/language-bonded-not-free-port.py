# -*- coding: utf-8 -*-
"""自检：P88 —— 母版「保税区域」被 fr 译成 zone franche"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    zh = H.lang_file(work, "zh", kind="regulation")
    fr = H.lang_file(work, "fr", kind="regulation")
    H.write_body(zh, H.body_of(zh).rstrip("\n") + "\n\n保税区域监管说明。\n")
    H.write_body(fr, H.body_of(fr).rstrip("\n") + "\n\nLa zone franche portuaire reste interdite.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P88", mutate, "fr 保税区域译成 zone franche", "regulation")]))
