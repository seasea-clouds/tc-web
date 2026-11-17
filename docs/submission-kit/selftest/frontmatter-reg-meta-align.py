# -*- coding: utf-8 -*-
"""自检：R23 —— 逐语 frontmatter 与题录对齐"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # fr 的 status 落成 draft，题录是 in_force：标签与数据源分叉
    p = H.lang_file(work, "fr", kind="regulation")
    H.patch_fm(p, "status", "draft")


if __name__ == "__main__":
    raise SystemExit(H.main([("R23", mutate, "fr status 与题录不一致")]))
