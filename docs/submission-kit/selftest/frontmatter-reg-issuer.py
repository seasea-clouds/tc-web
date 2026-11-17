# -*- coding: utf-8 -*-
"""自检：R18 —— 法规 issuer 必须在固定集合内"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 两个机构并列 + 中文全称：站方「发布机构」聚合页会多出一个机构
    H.patch_json(work, "issuer", "GACC & MARA", kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R18", mutate, "题录 issuer 写成两机构并列")]))
