# -*- coding: utf-8 -*-
"""自检：P58 —— 句末标记后小写开头"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 句号后紧跟小写开头：本语正字法硬伤
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLe dossier est prêt. la suite arrive lundi.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P58", mutate, "fr 句号后小写开头")]))
