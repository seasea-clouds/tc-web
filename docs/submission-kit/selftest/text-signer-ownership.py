# -*- coding: utf-8 -*-
"""自检：R08 —— 签字人不得写成包/交付物的所有者"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append_zh(work, para):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    _append_zh(work, "签字人拥有本方案的全部权利，交付件不另授权。")


if __name__ == "__main__":
    raise SystemExit(H.main([("R08", mutate, "zh 把签字人写成所有者")]))
