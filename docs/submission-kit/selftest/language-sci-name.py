# -*- coding: utf-8 -*-
"""自检：P65 —— 拉丁学名未逐字保留"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # zh 官方文本块写 Prunus salicina L.；fr 同位置只写俗名（学名丢失）
    zh = H.lang_file(work, "zh", kind="regulation")
    H.write_body(zh, H.body_of(zh).rstrip("\n")
                 + "\n\n**第3条**　本规定适用于 Prunus salicina L. 的鲜果。\n")
    fr = H.lang_file(work, "fr", kind="regulation")
    H.write_body(fr, H.body_of(fr).rstrip("\n")
                 + "\n\n**Article 3**　Le présent règlement s'applique aux "
                   "fruits frais de prunier.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P65", mutate, "fr 漏拉丁学名", "regulation")]))
