# -*- coding: utf-8 -*-
"""自检：F05 —— 某语 date 与题录不一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_fm(H.lang_file(work, "fr"), "date", "2025-01-01")


if __name__ == "__main__":
    raise SystemExit(H.main([("F05", mutate, "fr 的 date 改成 2025-01-01")]))
