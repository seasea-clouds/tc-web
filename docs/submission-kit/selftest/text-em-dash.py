# -*- coding: utf-8 -*-
"""自检：ST01 —— 正文出现 em dash（破折号）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLe contrôle — obligatoire depuis 2022 — prend deux jours.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("ST01", mutate, "fr 正文插入 em dash")]))
