# -*- coding: utf-8 -*-
"""自检：P41 —— 表前包名清单与 S1–S13 表格不一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

BULLETS = "\n".join("- 包%d：说明" % n for n in range(1, 14))
ROWS = ["| S0 | 汇总 |"] + ["| S%d | 包%d |" % (n, n) for n in range(1, 14)]
TABLE = "| 代号 | 包名 |\n| --- | --- |\n" + "\n".join(ROWS)


def mutate(work):
    # 表格 S7 行名写成「包七」，清单是「包7」：读者按清单点不到对应行
    p = H.lang_file(work, "zh")
    body = H.body_of(p).rstrip("\n")
    body += "\n\n" + BULLETS + "\n\n" + TABLE.replace(
        "| S7 | 包7 |", "| S7 | 包七 |") + "\n"
    H.write_body(p, body)


if __name__ == "__main__":
    raise SystemExit(H.main([("P41", mutate, "S7 表格名与清单不符")]))
