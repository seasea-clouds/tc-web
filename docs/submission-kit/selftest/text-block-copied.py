# -*- coding: utf-8 -*-
"""自检：P35 —— 整块照抄母版"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _list_block(body):
    return next((b for b in body.split("\n\n") if b.strip().startswith("- ")), None)


def mutate(work):
    # 把 fr 的列表块整块换成中文母版同位置块：块结构不变，只有这一段没译
    zh = _list_block(H.body_of(H.lang_file(work, "zh")))
    if not zh:
        raise RuntimeError("官方尺 zh 正文没有列表块")
    p = H.lang_file(work, "fr")
    blocks = H.body_of(p).split("\n\n")
    for i, b in enumerate(blocks):
        if b.strip().startswith("- "):
            blocks[i] = zh
            break
    H.write_body(p, "\n\n".join(blocks))


if __name__ == "__main__":
    raise SystemExit(H.main([("P35", mutate, "fr 列表块照抄中文母版")]))
