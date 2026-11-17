# -*- coding: utf-8 -*-
"""自检：R20 —— 法规译文标题标点须与中文母版一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 译文标题多一个冒号：母版没有冒号，标点类别 0≠1
    p = H.lang_file(work, "fr", kind="regulation")
    old = H.fm_value(p, "title") or ""
    H.patch_fm(p, "title", old + "：régime de contrôle")


if __name__ == "__main__":
    raise SystemExit(H.main([("R20", mutate, "fr 标题多一个冒号")]))
