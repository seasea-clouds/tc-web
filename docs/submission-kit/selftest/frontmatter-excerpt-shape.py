# -*- coding: utf-8 -*-
"""自检：F07 —— 摘要超长"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_fm(H.lang_file(work, "fr"), "excerpt", "长" * 200)


if __name__ == "__main__":
    raise SystemExit(H.main([("F07", mutate, "fr 的 excerpt 写成 200 字符")]))
