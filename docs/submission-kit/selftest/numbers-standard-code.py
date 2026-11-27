# -*- coding: utf-8 -*-
"""自检：P76 —— 标准代号后的数字用了本语字形"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "en", kind="regulation")
    body = H.body_of(p)
    tag = "ISPM " + chr(0x09E7) + chr(0x09EB) + "."
    if "ISPM 15" in body:
        body = body.replace("ISPM 15", tag, 1)
    else:
        body = body.replace(".", " " + tag, 1)
    H.write_body(p, body)


if __name__ == "__main__":
    raise SystemExit(H.main([("P76", mutate, "en 把 ISPM 代号写成本语数字",
                              "regulation")]))
