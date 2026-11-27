# -*- coding: utf-8 -*-
"""自检：P93 —— 裸斜杠数字日期（三段式月日歧义）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate_vi(work):
    # REG228 实证：vi 解读段写成 29/1/2026（日/月/年）
    p = H.lang_file(work, "vi")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nNgày 29/1/2026, thông báo số 14 có hiệu lực ngay.\n")


def mutate_en(work):
    # en 美式月/日/年同样是三段斜杠，歧义同源
    p = H.lang_file(work, "en")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nEffective on 9/30/2026 for all shipments.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P93", mutate_vi, "vi 裸斜杠日期 29/1/2026（REG228 实证）"),
        ("P93", mutate_en, "en 裸斜杠日期 9/30/2026"),
    ]))
