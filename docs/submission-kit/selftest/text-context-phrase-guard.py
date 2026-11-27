# -*- coding: utf-8 -*-
"""自检：P98 —— 上下文触发短语禁用形（产品清单 / 国名限定层）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def product(work):
    p = H.lang_file(work, "zh", "regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n本公告适用于电动砂轮机。\n")
    q = H.lang_file(work, "af", "regulation")
    H.write_body(q, H.body_of(q).rstrip("\n")
                 + "\n\nHierdie aankondiging geld vir elektriese slypwiele.\n")


def country(work):
    p = H.lang_file(work, "zh", "regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n中华人民共和国海关总署。\n")
    q = H.lang_file(work, "ur", "regulation")
    H.write_body(q, H.body_of(q).rstrip("\n")
                 + "\n\nجمہوریہ چین کی جنرل ایڈمنسٹریشن آف کسٹمز۔\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P98", product, "af 产品清单 slypwiele", "regulation"),
        ("P98", country, "ur 国名丢「人民」", "regulation"),
    ]))
