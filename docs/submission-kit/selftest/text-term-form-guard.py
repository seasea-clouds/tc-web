# -*- coding: utf-8 -*-
"""自检：P78 —— 领域术语禁用形（词表 term-guard）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append(work, lang, para):
    p = H.lang_file(work, lang, kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    # 同一缺陷族的两种匹配模式：de 走 phrase（多词短语），ja 走 substring（CJK）
    _append(work, "de", "Die Ware ist vom indonesischen Seite zugelassen.")
    _append(work, "ja", "魚粉一隻分を輸送する。")


if __name__ == "__main__":
    raise SystemExit(H.main([("P78", mutate, "de 介词格错 + ja 船隻量词误用",
                             "regulation")]))
