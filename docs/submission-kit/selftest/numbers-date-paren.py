# -*- coding: utf-8 -*-
"""自检：P69 —— 官方日期追加数字括注"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 完整日期后追加 (2026-9-28)：为凑数字校验的取巧写法
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nPublié le 28 septembre 2026 (2026-9-28).\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P69", mutate, "fr 日期加数字括注")]))
