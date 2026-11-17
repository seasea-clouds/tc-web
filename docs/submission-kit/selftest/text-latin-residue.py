# -*- coding: utf-8 -*-
"""自检：P30 —— 非拉丁语向夹用英文原词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # ru 正文两次保留 bonded（母版「保税」已本地化）：同一术语两种写法
    p = H.lang_file(work, "ru")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nПроверьте bonded склад и bonded зону перед отправкой.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P30", mutate, "ru 保留英文 bonded")]))
