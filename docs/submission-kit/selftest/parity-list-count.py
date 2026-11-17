# -*- coding: utf-8 -*-
"""自检：P21 —— 分节列表项数必须与母版一致"""
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
    lines = [ln for ln in H.body_of(p).split("\n")]
    for i, ln in enumerate(lines):
        if ln.startswith("- "):
            del lines[i]
            break
    H.write_body(p, "\n".join(lines))


if __name__ == "__main__":
    raise SystemExit(H.main([("P21", mutate, "删掉 fr 正文的第一条 bullet")]))
