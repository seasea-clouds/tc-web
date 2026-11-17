# -*- coding: utf-8 -*-
"""自检：S01 —— 顶层出现 blog/ regulation/ 之外的目录。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    d = Path(work) / "notes"
    d.mkdir()
    (d / "readme.md").write_text("草稿\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(H.main([("S01", mutate, "顶层加 notes/readme.md")]))
