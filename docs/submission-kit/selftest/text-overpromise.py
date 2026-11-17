# -*- coding: utf-8 -*-
"""自检：R06 —— 正文不得出现过度承诺"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append_zh(work, para):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    _append_zh(work, "我方保证通过查验，未通过全额退款。")


if __name__ == "__main__":
    raise SystemExit(H.main([("R06", mutate, "zh 承诺「保证通过」")]))
