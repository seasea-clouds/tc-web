# -*- coding: utf-8 -*-
"""自检：M04 —— 日期不存在"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "date", "2026-13-45")


if __name__ == "__main__":
    raise SystemExit(H.main([("M04", mutate, "题录 date 改成 2026-13-45")]))
