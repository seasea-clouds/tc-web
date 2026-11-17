# -*- coding: utf-8 -*-
"""自检：P44 —— 韩语数字与量词之间多空格"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 14 개：韩语量词应黏写
    p = H.lang_file(work, "ko")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n모두 14 개 품목을 확인했습니다.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P44", mutate, "ko 写 14 개")]))
