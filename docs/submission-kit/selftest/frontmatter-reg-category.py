# -*- coding: utf-8 -*-
"""自检：R17 —— 法规 category 必须在固定集合内"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 自由文本分类：站方导航按固定集合生成筛选器，写外的值不进任何栏目
    H.patch_json(work, "category", "Customs Notice", kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R17", mutate, "题录 category 写成自由文本")]))
