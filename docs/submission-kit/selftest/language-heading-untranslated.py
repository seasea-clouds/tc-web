# -*- coding: utf-8 -*-
"""自检：L07 —— 二级标题保留英文"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    import re
    en, fr = H.lang_file(work, "en"), H.lang_file(work, "fr")
    en_h = re.findall(r"(?m)^## (.+)$", H.body_of(en))
    body = H.body_of(fr)
    for h in en_h:
        body = re.sub(r"(?m)^## .+$", "## " + h, body, count=1)
    H.write_body(fr, body)


if __name__ == "__main__":
    raise SystemExit(H.main([("L07", mutate, "fr 的 ## 标题换成 en 标题")]))
