# -*- coding: utf-8 -*-
"""自检：L05 —— 换皮不换肉：正文与英文同源"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    en, fr = H.lang_file(work, "en"), H.lang_file(work, "fr")
    H.write_body(fr, H.body_of(en))


if __name__ == "__main__":
    raise SystemExit(H.main([("L05", mutate, "fr 正文换成 en 正文")]))
