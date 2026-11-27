# -*- coding: utf-8 -*-
"""自检：P102 —— zh 母版有「第六条」，译文写「chapitre VI」必须报红。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H  # noqa: E402


def mutate(work):
    pzh = H.lang_file(work, "zh", kind="regulation")
    H.write_body(pzh, H.body_of(pzh).rstrip() + "\n\n第六条 附则。\n")
    pfr = H.lang_file(work, "fr", kind="regulation")
    H.write_body(pfr, H.body_of(pfr).rstrip() + "\n\nchapitre VI, section (vi).\n")


if __name__ == "__main__":
    rc = H.main([("P102", mutate, "fr 把第六条写成 chapitre VI", "regulation")])
    raise SystemExit(rc)
