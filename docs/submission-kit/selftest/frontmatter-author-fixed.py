# -*- coding: utf-8 -*-
"""自检：M06 —— 作者署名漂移"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "author", "Someone Else")


if __name__ == "__main__":
    raise SystemExit(H.main([("M06", mutate, "题录 author 改成 Someone Else")]))
