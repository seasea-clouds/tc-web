# -*- coding: utf-8 -*-
"""自检：P31 —— 拉丁语向术语未本地化"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # nl 用英文 bonded warehouse，本语应有词形（策略库 term-localization 词表）
    p = H.lang_file(work, "nl")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nWij controleren het bonded warehouse elke week.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P31", mutate, "nl 使用英文 bonded")]))
