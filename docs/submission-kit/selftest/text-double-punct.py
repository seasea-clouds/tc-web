# -*- coding: utf-8 -*-
"""自检：P06 —— 重复标点是情绪化写法或批量替换事故，正式稿只用单标点。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nC est important !!\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P06", mutate, "重复标点是情绪化写法或批量替换事故，正式稿只用单标点。")]))
