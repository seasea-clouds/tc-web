# -*- coding: utf-8 -*-
"""自检：M03 —— 题录 slug 与目录名不一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "slug", "other-slug")


if __name__ == "__main__":
    raise SystemExit(H.main([("M03", mutate, "题录 slug 改成 other-slug")]))
