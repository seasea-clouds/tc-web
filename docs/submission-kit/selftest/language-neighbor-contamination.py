# -*- coding: utf-8 -*-
"""自检：P68 —— 近缘语言正字法污染"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "da")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nBeløpet er registrert i systemet beløp.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P68", mutate, "da 用挪威语 beløp")]))
