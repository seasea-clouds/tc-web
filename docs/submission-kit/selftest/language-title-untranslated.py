# -*- coding: utf-8 -*-
"""自检：L01 —— 某语 title 照抄英文"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    en, fr = H.lang_file(work, "en"), H.lang_file(work, "fr")
    H.patch_fm(fr, "title", H.fm_value(en, "title"))


if __name__ == "__main__":
    raise SystemExit(H.main([("L01", mutate, "fr title 复制 en title")]))
