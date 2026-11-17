# -*- coding: utf-8 -*-
"""自检：R22 —— 法规正文禁用数字列表块"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 官方序号写成 markdown 有序列表：P21/P23 会连锁误报，须在母版阶段拦住
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n1. 境外企业应当在出口前办理注册。\n"
                 + "2. 未办理注册的批次不予受理。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("R22", mutate, "zh 出现 1./2. 数字列表")]))
