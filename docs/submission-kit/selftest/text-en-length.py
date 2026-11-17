# -*- coding: utf-8 -*-
"""自检：W01 —— 英文正文偏短的**正向控制**

官方尺 en 正文只有 80 词，该判据在基线上本来就红（这是设计上的：官方尺是
最小样例，不是完整文章）。因此这条臂反过来验证：把 en 补到 400 词以上后，
判据必须不再报——证明它真的按词数判，而不是恒红。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

FILLER = ("The checklist below covers the four checks that decide whether a "
          "consignment clears Chinese customs. ") * 60


def mutate(work):
    p = H.lang_file(work, "en")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + FILLER + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("W01", mutate, "en 补到 400 词以上", "blog", "green")]))
