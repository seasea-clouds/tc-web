# -*- coding: utf-8 -*-
"""自检：P42 —— 亚美尼亚语正文出现 ASCII 句点"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 句末用 ASCII 句点（应为 ։
    p = H.lang_file(work, "hy")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nՓաստաթուղթը պատրաստ է.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P42", mutate, "hy 句末用 ASCII 句点")]))
