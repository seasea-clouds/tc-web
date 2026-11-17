# -*- coding: utf-8 -*-
"""自检：P43 —— 禁用译法（词形合法但概念用错）

夹具自带隔离禁用条款（lang=fr，整篇匹配），不读共享库。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "banned": [{
        "id": "selftest-banned",
        "lang": "fr",
        "terms": ["guichet douanier"],
    }],
}


def mutate(work):
    # 注入合法词组但概念错位（「海关窗口」代替「海关」）：拼写与语法都没问题
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLe guichet douanier reste fermé le week-end.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P43", mutate, "fr 正文出现禁用译法", "blog", "red", GL)]))
