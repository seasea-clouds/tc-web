# -*- coding: utf-8 -*-
"""自检：L02 —— 某语 excerpt 照抄英文"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    en, fr = H.lang_file(work, "en"), H.lang_file(work, "fr")
    H.patch_fm(fr, "excerpt", H.fm_value(en, "excerpt"))


if __name__ == "__main__":
    raise SystemExit(H.main([("L02", mutate, "fr excerpt 复制 en excerpt")]))
