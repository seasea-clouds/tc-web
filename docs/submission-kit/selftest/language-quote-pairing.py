# -*- coding: utf-8 -*-
"""自检：P60 —— 德式引号 „ 的闭引号错用"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # „ 开 + ASCII " 闭：闭引号跨族（应为 “）
    p = H.lang_file(work, "de")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + '\n\nDer Antrag heißt „Registrierung" im Formular.\n')


if __name__ == "__main__":
    raise SystemExit(H.main([("P60", mutate, "de „ 用 ASCII 直引号闭")]))
