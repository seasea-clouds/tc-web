# -*- coding: utf-8 -*-
"""自检：P84 —— hu 出现法语借形 palléta"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    hu = H.lang_file(work, "hu", kind="regulation")
    H.write_body(hu, H.body_of(hu).rstrip("\n")
                 + "\n\nA palléta jelölés ellenőrzése.\n")


def mutate_pl(work):
    pl = H.lang_file(work, "pl", kind="regulation")
    H.write_body(pl, H.body_of(pl).rstrip("\n")
                 + "\n\n/Ja, Doris Duke,/\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P84", mutate, "hu 托盘错形", "regulation"),
        ("P84", mutate_pl, "pl 署名行机器幻觉", "regulation"),
    ]))
