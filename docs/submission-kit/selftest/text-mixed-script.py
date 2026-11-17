# -*- coding: utf-8 -*-
"""自检：P08 —— 混文字系统词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 同一个 token 里西里尔 + 拉丁：本地化漏改事故
    p = H.lang_file(work, "ru")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nПроверьте лицензияlizenz перед отправкой.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P08", mutate, "ru 出现 лицензияlizenz")]))
