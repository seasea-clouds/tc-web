# -*- coding: utf-8 -*-
"""自检：M13 —— sourceUrl 形状不合法"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "sourceUrl", "www.customs.gov.cn/notice/1")


if __name__ == "__main__":
    raise SystemExit(H.main([("M13", mutate, "sourceUrl 改成没有协议的地址")]))
