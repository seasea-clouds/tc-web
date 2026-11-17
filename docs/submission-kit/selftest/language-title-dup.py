# -*- coding: utf-8 -*-
"""自检：L06 —— title/excerpt 跨语言完全相同"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # fr 直接抄 zh 的标题与摘要：两个语向同名条目
    zh = H.lang_file(work, "zh")
    title = H.fm_value(zh, "title")
    excerpt = H.fm_value(zh, "excerpt")
    p = H.lang_file(work, "fr")
    H.patch_fm(p, "title", title)
    H.patch_fm(p, "excerpt", excerpt)


if __name__ == "__main__":
    raise SystemExit(H.main([("L06", mutate, "fr 标题摘要照抄 zh")]))
