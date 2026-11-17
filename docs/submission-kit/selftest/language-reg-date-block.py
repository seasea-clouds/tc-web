# -*- coding: utf-8 -*-
"""自检：P62 —— 法规解读块1 缺 published_at 年份"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

MARK = "<!-- original -->"


def mutate(work):
    # zh 解读块1 写出 2026 年 1 月 15 日；fr 解读块1 丢年份 → 跨篇复制痕迹
    zh = H.lang_file(work, "zh", kind="regulation")
    body = H.body_of(zh)
    head, tail = body.split(MARK, 1)
    H.write_body(zh, "本规定于 2026 年 1 月 15 日发布，自 6 月 1 日起施行。\n\n"
                 + MARK + tail)
    fr = H.lang_file(work, "fr", kind="regulation")
    fbody = H.body_of(fr)
    fhead, ftail = fbody.split(MARK, 1)
    H.write_body(fr, "Le présent règlement entre en vigueur le 1er juin.\n\n"
                 + MARK + ftail)


if __name__ == "__main__":
    raise SystemExit(H.main([("P62", mutate, "fr 解读块1 缺年份 2026", "regulation")]))
