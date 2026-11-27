# -*- coding: utf-8 -*-
"""自检：P86 —— 块首重复编号前缀"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr", kind="regulation")
    body = H.body_of(p)
    H.write_body(p, body.rstrip() + "\n\nII. II. Dispositions générales\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P86", mutate, "fr 注入 II. II. 双前缀",
                              "regulation")]))
