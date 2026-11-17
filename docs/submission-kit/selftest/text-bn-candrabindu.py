# -*- coding: utf-8 -*-
"""自检：P38 —— 孟加拉文裸辅音 + CANDRABINDU"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # শঁচ：裸辅音 শ(U+09B6) 紧跟 CANDRABINDU(U+0981)，码位形状不成立
    p = H.lang_file(work, "bn")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\nশঁচ যাচাই করুন।\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P38", mutate, "bn 出现裸辅音+ঁ")]))
