# -*- coding: utf-8 -*-
"""自检：ST04 —— 中文 AI 高频词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n我们赋能客户，把流程做成闭环。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST04", mutate, "zh 正文插入 赋能/闭环")]))
