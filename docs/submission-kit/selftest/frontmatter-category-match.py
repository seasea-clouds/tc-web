# -*- coding: utf-8 -*-
"""自检：F06 —— 题录与某语 category 不一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_fm(H.lang_file(work, "fr"), "category", "Label Compliance")


if __name__ == "__main__":
    raise SystemExit(H.main([("F06", mutate, "fr 的 category 改成 Label Compliance")]))
