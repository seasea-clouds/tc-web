# -*- coding: utf-8 -*-
"""自检：P96 —— 法规落款日期行首序号点"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate_day(work):
    p = H.lang_file(work, "de", "regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n28. Dezember 2025\n")


def mutate_year(work):
    # REG256 实证：hu 落款 `2026. szeptember 1.` 以四位年份+点开头，
    # core 结构解析仍判 LIST，P21/P22/P23 连锁报红
    p = H.lang_file(work, "hu", "regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n2026. szeptember 1.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P96", mutate_day, "de 落款 28. Dezember 2025", "regulation"),
        ("P96", mutate_year, "hu 落款 2026. szeptember 1.", "regulation"),
    ]))
