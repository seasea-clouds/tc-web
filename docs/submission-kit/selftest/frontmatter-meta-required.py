# -*- coding: utf-8 -*-
"""自检：M02 —— 必填字段缺失"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "author", H.DELETE)


if __name__ == "__main__":
    raise SystemExit(H.main([("M02", mutate, "题录删掉 author 键")]))
