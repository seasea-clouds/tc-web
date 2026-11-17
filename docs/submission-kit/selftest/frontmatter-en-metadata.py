# -*- coding: utf-8 -*-
"""自检：M09 —— 题录标题与 en frontmatter 漂移"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "title", "A title that drifted from the article")


if __name__ == "__main__":
    raise SystemExit(H.main([("M09", mutate, "题录 title 改成别的")]))
