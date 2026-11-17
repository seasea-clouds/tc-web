# -*- coding: utf-8 -*-
"""自检：P27 —— 行内链接目标必须与母版一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # fr 的 CTA 从 /fr/packages/ 改成 /fr/pricing/：语言前缀仍对，路径错
    p = H.lang_file(work, "fr")
    body = H.body_of(p)
    if "](/fr/packages/)" not in body:
        raise RuntimeError("官方尺 fr 正文里找不到 CTA 链接 /fr/packages/")
    H.write_body(p, body.replace("](/fr/packages/)", "](/fr/pricing/)"))


if __name__ == "__main__":
    raise SystemExit(H.main([("P27", mutate, "fr CTA 路径改成 /ru/pricing/")]))
