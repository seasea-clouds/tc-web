# -*- coding: utf-8 -*-
"""自检：P45 —— 称呼语域混用"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 同一段里 tu 与 vous 并存：非尊形 × 尊形（词表大小写敏感，tu 须小写）
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nSi tu peux nous écrire, vous recevrez la réponse.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P45", mutate, "fr 混用 tu / vous")]))
