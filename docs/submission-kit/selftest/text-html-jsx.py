# -*- coding: utf-8 -*-
"""自检：B05 —— 站点只渲染 markdown 与白名单组件，裸标签会原样显示或直接报错。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n<div class=\"note\">x</div>\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B05", mutate, "站点只渲染 markdown 与白名单组件，裸标签会原样显示或直接报错。")]))
