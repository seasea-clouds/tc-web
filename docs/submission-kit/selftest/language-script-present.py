# -*- coding: utf-8 -*-
"""自检：L03 —— 某语正文整篇是英文"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 拉丁语向在 SCRIPT_TESTS 里没有条目（同属拉丁字母，无法靠字形区分），
    # 这条判据的真实射程是非拉丁语向，故注入 ru。
    en, ru = H.lang_file(work, "en"), H.lang_file(work, "ru")
    H.write_body(ru, H.body_of(en))
    H.patch_fm(ru, "title", H.fm_value(en, "title"))
    H.patch_fm(ru, "excerpt", H.fm_value(en, "excerpt"))


if __name__ == "__main__":
    raise SystemExit(H.main([("L03", mutate, "ru 题录+正文换成英文")]))
