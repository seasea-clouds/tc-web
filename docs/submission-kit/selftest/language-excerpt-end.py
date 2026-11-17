# -*- coding: utf-8 -*-
"""自检：P40 —— 摘要末尾缺句末标点"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 摘要以小写词收尾、无句号：列表页看起来被截断
    p = H.lang_file(work, "fr")
    H.patch_fm(p, "excerpt", "Quatre contrôles décident du passage en douane")


if __name__ == "__main__":
    raise SystemExit(H.main([("P40", mutate, "fr 摘要无句末标点")]))
