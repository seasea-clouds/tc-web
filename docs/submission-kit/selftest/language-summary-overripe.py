# -*- coding: utf-8 -*-
"""自检：P85 —— 摘要「过熟」被弱化成「成熟」"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    zh = H.lang_file(work, "zh", kind="regulation")
    fr = H.lang_file(work, "fr", kind="regulation")
    for p, first in ((zh, None), (fr, "Les bananes jaunes mûres sont interdites.")):
        blocks = [b.strip() for b in H.body_of(p).strip().split("\n\n") if b.strip()]
        if first is None:
            blocks[0] = blocks[0] + " 过熟黄香蕉一律不许出口。"
        else:
            blocks[0] = first
        H.write_body(p, "\n\n" + "\n\n".join(blocks) + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P85", mutate, "fr 摘要过熟弱化", "regulation")]))
