# -*- coding: utf-8 -*-
"""自检：R11 —— 标记只能出现一次"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

MARK = "<!-- original -->"


def mutate(work):
    # 复制一个标记：页面按第一个标记切分，后面内容全被当成小字全文
    p = H.lang_file(work, "zh", kind="regulation")
    body = H.body_of(p)
    if body.count(MARK) != 1:
        raise RuntimeError("官方尺正文本里的标记不是 1 个")
    H.write_body(p, body.replace(MARK, MARK + "\n\n" + MARK))


if __name__ == "__main__":
    raise SystemExit(H.main([("R11", mutate, "zh 标记出现两次")]))
