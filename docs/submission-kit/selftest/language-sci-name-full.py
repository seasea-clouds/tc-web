# -*- coding: utf-8 -*-
"""自检：P79 —— 学名的种下加词未逐字保留（本语句点替换学名内部的点）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    zh = H.lang_file(work, "zh", kind="regulation")
    H.write_body(zh, H.body_of(zh).rstrip("\n")
                 + "\n\n**第3条**　本规定适用于 Prunus salicina L. 及 "
                   "Fusarium oxysporum Schlecht f. sp. cubense 的检疫。\n")
    fr = H.lang_file(work, "fr", kind="regulation")
    H.write_body(fr, H.body_of(fr).rstrip("\n")
                 + "\n\n**Article 3**　Le présent règlement s'applique à "
                   "Prunus salicina L. et à Fusarium oxysporum Schlecht "
                   "f. sp. Cubense.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P79", mutate, "fr 种下加词被改写", "regulation")]))
