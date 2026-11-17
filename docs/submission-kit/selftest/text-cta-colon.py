# -*- coding: utf-8 -*-
"""自检：P12 —— `Contact us: [..](/xx/packages/)` 这种冒号式 CTA 是模板化写法，应把链接内嵌进句子。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nContact us: [Contact us](/fr/packages/)\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P12", mutate, "`Contact us: [..](/xx/packages/)` 这种冒号式 CTA 是模板化写法，应把链接内嵌进句子。")]))
