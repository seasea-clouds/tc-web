# -*- coding: utf-8 -*-
"""自检：F12 —— 法规 doc_number 不得带年份"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh", kind="regulation")
    s = p.read_text(encoding="utf-8")
    assert "doc_number: \"Test Decree No. 1\"" in s, "夹具 doc_number 形态变化"
    s = s.replace('doc_number: "Test Decree No. 1"',
                  'doc_number: "Test Decree No. 1 (2026)"', 1)
    p.write_text(s, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("F12", mutate, "zh doc_number 加 (2026) 年份", "regulation")]))
