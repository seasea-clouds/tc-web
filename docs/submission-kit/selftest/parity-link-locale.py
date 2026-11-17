# -*- coding: utf-8 -*-
"""自检：P29 —— 正文链接的语言前缀必须是本文自己的语言"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # fr 的 CTA 前缀写成 de：路径正确、前缀指错语言
    p = H.lang_file(work, "fr")
    body = H.body_of(p)
    if "](/fr/packages/)" not in body:
        raise RuntimeError("官方尺 fr 正文里找不到 CTA 链接 /fr/packages/")
    H.write_body(p, body.replace("](/fr/packages/)", "](/de/packages/)"))


if __name__ == "__main__":
    raise SystemExit(H.main([("P29", mutate, "fr CTA 前缀改成 /de/")]))
