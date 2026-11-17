# -*- coding: utf-8 -*-
"""自检：R04 —— 正文不得承诺交付周期"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # en 是时限承诺句式的主要落点（词表为英文形）
    p = H.lang_file(work, "en", kind="regulation")
    body = H.body_of(p).rstrip("\n")
    H.write_body(p, body + "\n\nDelivery is arranged within 3 days of filing.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("R04", mutate, "en 承诺 3 天交付")]))
