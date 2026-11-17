# -*- coding: utf-8 -*-
"""自检：P73 —— 分号后紧贴非空白"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 摘要层「;」后紧贴下一词（应为「; 」）
    p = H.lang_file(work, "fr")
    old = H.fm_value(p, "excerpt") or ""
    H.patch_fm(p, "excerpt", old + " frais;delais applicables")


if __name__ == "__main__":
    raise SystemExit(H.main([("P73", mutate, "fr 摘要分号后无空格")]))
