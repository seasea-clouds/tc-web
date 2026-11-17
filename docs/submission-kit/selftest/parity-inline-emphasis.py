# -*- coding: utf-8 -*-
"""自检：P26 —— 行内强调必须落在母版的同一位置"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 母版首段整段加粗，译文首段不加粗：块规模不变，加粗数 1≠0
    p = H.lang_file(work, "zh")
    blocks = H.body_of(p).split("\n\n")
    blocks[0] = "**" + blocks[0].strip() + "**"
    H.write_body(p, "\n\n".join(blocks))


if __name__ == "__main__":
    raise SystemExit(H.main([("P26", mutate, "zh 首段加粗、译文未加粗")]))
