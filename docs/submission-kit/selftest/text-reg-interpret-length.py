# -*- coding: utf-8 -*-
"""自检：R21 —— 解读段篇幅上限"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

MARK = "<!-- original -->"
LONG = ("本次修订进一步明确了境外生产企业的注册范围与办理流程，"
        "并对申报材料、审核时限与变更备案作出细化规定，" * 12)


def mutate(work):
    # 解读段写到 500+ 汉字：法规页主体应让给官方文本
    p = H.lang_file(work, "zh", kind="regulation")
    body = H.body_of(p)
    head, tail = body.split(MARK, 1)
    H.write_body(p, head.rstrip("\n") + "\n\n" + LONG + "\n\n" + MARK + tail)


if __name__ == "__main__":
    raise SystemExit(H.main([("R21", mutate, "zh 解读段写到 500 字")]))
