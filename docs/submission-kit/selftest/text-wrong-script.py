# -*- coding: utf-8 -*-
"""自检：P56 —— 非本语言文字系统的字母"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # ru 正文混进希腊字母 α：串稿/复制残留
    p = H.lang_file(work, "ru")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nПроверьте документ α перед отправкой.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P56", mutate, "ru 混进希腊字母")]))
