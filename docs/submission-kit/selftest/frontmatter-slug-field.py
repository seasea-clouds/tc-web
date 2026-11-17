# -*- coding: utf-8 -*-
"""自检：F04 —— 某语 slug 与条目不一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_fm(H.lang_file(work, "fr"), "slug", "xxx-de")


if __name__ == "__main__":
    raise SystemExit(H.main([("F04", mutate, "fr 的 slug 改成 xxx-de")]))
