# -*- coding: utf-8 -*-
"""自检：M11 —— blog 目录下写 kind=regulation"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "kind", "regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("M11", mutate, "题录 kind 改成 regulation")]))
