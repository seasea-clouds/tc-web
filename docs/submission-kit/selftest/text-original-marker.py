# -*- coding: utf-8 -*-
"""自检：R10 —— 正文必须有 <!-- original --> 标记"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

MARK = "<!-- original -->"


def mutate(work):
    # 删掉分隔标记：页面只剩解读、不出现官方全文
    p = H.lang_file(work, "zh", kind="regulation")
    body = H.body_of(p)
    if MARK not in body:
        raise RuntimeError("官方尺正文本里找不到 %s" % MARK)
    H.write_body(p, body.replace(MARK, "").replace("\n\n\n", "\n\n"))


if __name__ == "__main__":
    raise SystemExit(H.main([("R10", mutate, "zh 删掉原文分隔标记")]))
