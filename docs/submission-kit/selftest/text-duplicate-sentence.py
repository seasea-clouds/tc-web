# -*- coding: utf-8 -*-
"""自检：P17 —— 同一句连写两遍是拼接事故（分批生成时把上一批的最后一段又写了一遍）。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    s = ("Cette phrase de controle est volontairement longue pour "
         "declencher la detection des repetitions. ")
    H.write_body(p, H.body_of(p) + "\n" + s + s + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P17", mutate, "同一句连写两遍是拼接事故（分批生成时把上一批的最后一段又写了一遍）。")]))
