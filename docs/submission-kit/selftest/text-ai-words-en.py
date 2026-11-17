# -*- coding: utf-8 -*-
"""自检：ST03 —— 英文 AI 高频词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nWe delve into the details of each shipment here.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST03", mutate, "fr 正文插入 delve")]))
