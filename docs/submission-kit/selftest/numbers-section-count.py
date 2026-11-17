# -*- coding: utf-8 -*-
"""自检：P02 —— 小节数不一致说明译文把「## 」标题改成了正文，或自行加了一节。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n## Section en trop\n\nTexte.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P02", mutate, "小节数不一致说明译文把「## 」标题改成了正文，或自行加了一节。")]))
