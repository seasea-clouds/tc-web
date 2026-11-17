# -*- coding: utf-8 -*-
"""自检：R14 —— 法规 status 必须在枚举内"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 自由文本状态：站方标签组件认不出，页面顶部空白
    H.patch_json(work, "status", "in force", kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R14", mutate, "题录 status 写成 in force")]))
