# -*- coding: utf-8 -*-
"""自检：P54 —— 文号年份介词写成 fra"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 丹麦语文号「nr. 486 fra 2018」：年份介词应为 år
    p = H.lang_file(work, "da")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nBekendtgørelse nr. 486 fra 2018 af Miljøstyrelsen.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P54", mutate, "da 文号用 fra 2018")]))
