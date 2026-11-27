# -*- coding: utf-8 -*-
"""自检：P04 —— 关键数字跨语齐全；条款区间枚举不得漏中间项。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate_fact_missing(work):
    p = H.lang_file(work, "zh")
    H.write_body(p, H.body_of(p) + "\n（本期合计 98765 元。）\n")


def mutate_interval_missing_middle(work):
    # 母版「第（六）至（八）条」；de 同序块只列 (6) und (8)，漏第 7 项
    zh = H.lang_file(work, "zh", kind="regulation")
    H.write_body(zh, H.body_of(zh).rstrip("\n")
                 + "\n\n按照上述第（六）至（八）条要求提交的电子信息。\n")
    de = H.lang_file(work, "de", kind="regulation")
    H.write_body(de, H.body_of(de).rstrip("\n")
                 + "\n\n(6) und (8) genannte elektronischen Informationen.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P04", mutate_fact_missing,
         "母版 ≥1000 整数译文缺失", "blog"),
        ("P04", mutate_interval_missing_middle,
         "区间枚举漏中间项（6 至 8 只列端点）", "regulation"),
    ]))
