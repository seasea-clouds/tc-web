# -*- coding: utf-8 -*-
"""自检：P11 —— alt 文本跨语言完全相同"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 把 zh 的 alt 原样搬到 fr：两语 alt 完全一致＝图片说明没译
    zh = H.lang_file(work, "zh")
    m = re.search(r"!\[([^\]]+)\]", H.body_of(zh))
    if not m:
        raise RuntimeError("官方尺 zh 正文没有带 alt 的图片")
    alt = m.group(1)
    p = H.lang_file(work, "fr")
    body = re.sub(r"!\[[^\]]*\]", "![%s]" % alt, H.body_of(p), count=1)
    H.write_body(p, body)


if __name__ == "__main__":
    raise SystemExit(H.main([("P11", mutate, "fr alt 照抄 zh")]))
