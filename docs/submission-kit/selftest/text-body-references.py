# -*- coding: utf-8 -*-
"""自检：B04 —— 正文里写 References 会与站方文末渲染的参考文献重复，且不参与引用样式。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n## References\n\n- x\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B04", mutate, "正文里写 References 会与站方文末渲染的参考文献重复，且不参与引用样式。")]))
