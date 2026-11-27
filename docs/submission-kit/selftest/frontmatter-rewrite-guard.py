# -*- coding: utf-8 -*-
"""自检：P97 —— frontmatter 压缩改写守卫"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.drop_fm_close(H.lang_file(work, "de"))


if __name__ == "__main__":
    raise SystemExit(H.main([("P97", mutate, "de frontmatter 缺收尾 ---")]))
