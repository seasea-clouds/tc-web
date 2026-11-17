# -*- coding: utf-8 -*-
"""自检：P23 —— 逐块大纲必须与母版一一对应"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _swap_blocks(work, lang="fr"):
    """交换该语正文的前两块，制造块顺序 / 大纲错位。"""
    p = H.lang_file(work, lang)
    body = H.body_of(p)
    blocks = [b for b in body.split("\n\n") if b.strip()]
    blocks[0], blocks[1] = blocks[1], blocks[0]
    H.write_body(p, "\n\n".join(blocks) + "\n")


def mutate(work):
    p = H.lang_file(work, "fr")
    blocks = [b for b in H.body_of(p).split("\n\n") if b.strip()]
    blocks[0:2] = ["\n".join(blocks[0:2])]
    H.write_body(p, "\n\n".join(blocks) + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P23", mutate, "把 fr 正文前两块并成一块")]))
