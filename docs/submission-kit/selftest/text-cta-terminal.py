# -*- coding: utf-8 -*-
"""自检：P50 —— CTA 末行缺终止标点"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 末行去掉句号：页面上表现为句子没写完
    p = H.lang_file(work, "fr")
    body = H.body_of(p).rstrip("\n")
    if not body.endswith("."):
        raise RuntimeError("官方尺 fr 正文不是以句点结尾，注入点不成立")
    H.write_body(p, body[:-1] + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P50", mutate, "fr 末行去掉句号")]))
