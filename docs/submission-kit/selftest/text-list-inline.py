# -*- coding: utf-8 -*-
"""自检：B08 —— 同一行写多个 `- ` 项时 markdown 只渲染第一项，后面的箭头和文字进正文。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n- 甲 - 乙\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B08", mutate, "同一行写多个 `- ` 项时 markdown 只渲染第一项，后面的箭头和文字进正文。")]))
