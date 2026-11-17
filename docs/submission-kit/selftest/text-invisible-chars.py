# -*- coding: utf-8 -*-
"""自检：P14 —— 软连字符、零宽空格、BOM、双向控制符、替换字符都是编辑器或复制残留。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\nTexte\u200b invisible.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P14", mutate, "软连字符、零宽空格、BOM、双向控制符、替换字符都是编辑器或复制残留。")]))
