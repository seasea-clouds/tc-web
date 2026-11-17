# -*- coding: utf-8 -*-
"""自检：P64 —— 同篇术语异形混用"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # ru 正形「упаковочные предприятия」与登记错形「упаковочные цеха」同篇并存
    p = H.lang_file(work, "ru")
    # 词表大小写敏感：两形都以小写出现在句中
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nСначала упаковочные предприятия, затем "
                   "упаковочные цеха проверяются отдельно.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P64", mutate, "ru 术语两形并存")]))
