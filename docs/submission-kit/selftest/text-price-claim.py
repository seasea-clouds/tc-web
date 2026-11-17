# -*- coding: utf-8 -*-
"""自检：R03 —— 正文不得出现价格 / 金额"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append_zh(work, para):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    # 硬报价（非近似表述）：命中「符号 + 数字」
    _append_zh(work, "单批次代办费 ¥ 800，含预审与申报。")


if __name__ == "__main__":
    raise SystemExit(H.main([("R03", mutate, "zh 正文出现硬报价 ¥800")]))
