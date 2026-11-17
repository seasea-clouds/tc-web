# -*- coding: utf-8 -*-
"""自检：R16 —— 法规题录不得写 date"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 多写一个 date：与 publishedAt 语义重复，改稿必然分叉
    H.patch_json(work, "date", "2026-01-01", kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R16", mutate, "法规题录多写 date")]))
