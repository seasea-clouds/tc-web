# -*- coding: utf-8 -*-
"""自检：F11 —— 法规 frontmatter 残留模板占位元数据"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "zh", kind="regulation")
    s = p.read_text(encoding="utf-8")
    assert "Test Decree No. 1" in s, "夹具未做占位中性化"
    p.write_text(s.replace("Test Decree No. 1", "Sample Decree No. 1", 1),
                 encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("F11", mutate, "zh doc_number 改回模板占位 Sample Decree", "regulation")]))
