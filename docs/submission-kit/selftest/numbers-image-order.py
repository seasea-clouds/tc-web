# -*- coding: utf-8 -*-
"""自检：P18 —— 顺序不同会让读者按错误的次序看图，讲解与图注错位。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    b = H.body_of(p)
    # 官方尺只有一张图，无法靠两图互换制造顺序差：把首图复制到文末，
    # 序列由 (f1) 变 (f1, f1)，与母版不一致即触发；顺带触发 P01 不影响本臂。
    first = [ln for ln in b.split("\n") if ln.startswith("![")]
    assert first, "官方尺没有图片引用"
    H.write_body(p, b + "\n" + first[0] + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P18", mutate, "顺序不同会让读者按错误的次序看图，讲解与图注错位。")]))
