# -*- coding: utf-8 -*-
"""自检：ST07 —— 段内序号连排"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n① 先查产品类别 ② 再核标签稿 ③ 最后做品牌备案。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST07", mutate, "zh 一段塞三个序号")]))
