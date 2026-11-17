# -*- coding: utf-8 -*-
"""自检：L08 —— references 标题保留英文"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    en, fr = H.lang_file(work, "en"), H.lang_file(work, "fr")
    H.copy_fm_block(fr, "references", en)


if __name__ == "__main__":
    raise SystemExit(H.main([("L08", mutate, "fr references 复制 en 块")]))
