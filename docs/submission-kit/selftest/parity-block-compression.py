# -*- coding: utf-8 -*-
"""自检：P83 —— fr 某一块被压到原文四成"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    fr = H.lang_file(work, "fr", kind="regulation")
    blocks = [b.strip() for b in H.body_of(fr).strip().split("\n\n") if b.strip()]
    idx = next((i for i, b in enumerate(blocks)
                if 1 <= i and len(b) >= 80), None)
    if idx is None:
        raise RuntimeError("找不到可压缩的长块")
    blocks[idx] = blocks[idx][:8]
    H.write_body(fr, "\n\n" + "\n\n".join(blocks) + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P83", mutate, "fr 单块压缩", "regulation")]))
