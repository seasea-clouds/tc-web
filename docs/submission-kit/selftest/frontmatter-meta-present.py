# -*- coding: utf-8 -*-
"""自检：M01 —— 题录文件缺失"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.sub_json(work).unlink()


if __name__ == "__main__":
    raise SystemExit(H.main([("M01", mutate, "删除 submission.json")]))
