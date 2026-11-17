# -*- coding: utf-8 -*-
"""自检：P63 —— 引号跨族配对"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # hu „ 开 + 书名号族 » 闭：一对引号跨两族
    p = H.lang_file(work, "hu")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nA kérelem „regisztráció» néven fut.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P63", mutate, "hu „…» 跨族")]))
