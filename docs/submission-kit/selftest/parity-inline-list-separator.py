# -*- coding: utf-8 -*-
"""自检：P80 —— 合并块丢分隔，序号紧贴上一条末尾"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    zh = H.lang_file(work, "zh", kind="regulation")
    H.write_body(zh, H.body_of(zh).rstrip("\n")
                 + "\n\n**第3条**　下列物品须实施检疫：1．苹果；2．梨；3．桃。\n")
    fr = H.lang_file(work, "fr", kind="regulation")
    H.write_body(fr, H.body_of(fr).rstrip("\n")
                 + "\n\n**Article 3**　Les produits suivants sont soumis au "
                   "contrôle : 1. pommes2. poires3. pêches.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P80", mutate, "fr 序号粘连", "regulation")]))
