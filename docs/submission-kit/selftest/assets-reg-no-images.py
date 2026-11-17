# -*- coding: utf-8 -*-
"""自检：R12 —— 法规不使用配图"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 题录里塞一张图：法规页会渲染出「配图区」
    H.patch_json(work, "images", ["cover.webp"], kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R12", mutate, "法规题录 images 非空")]))
