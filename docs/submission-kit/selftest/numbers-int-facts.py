# -*- coding: utf-8 -*-
"""自检：P19 —— 母版里的文号、限额、天数等整数编号，各语可用本族数字或数词书写，但不得缺项。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p) + "\n（依据 4321 号公告办理。）\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P19", mutate, "母版里的文号、限额、天数等整数编号，各语可用本族数字或数词书写，但不得缺项。")]))
