# -*- coding: utf-8 -*-
"""自检：P46 —— 文章级术语表已废止"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 在包内放一份文章级词形表：与术语库形成双份契约
    root = H.article_root(work, "blog")
    d = root / "pipeline"
    d.mkdir(parents=True, exist_ok=True)
    (d / "glossary.json").write_text('{"bonded": "保税"}\n', encoding="utf-8",
                                     newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P46", mutate, "包内放 pipeline/glossary.json")]))
