# -*- coding: utf-8 -*-
"""自检：M05 —— 分类不在枚举内"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "category", "Compliance")


if __name__ == "__main__":
    raise SystemExit(H.main([("M05", mutate, "题录 category 改成 Compliance")]))
