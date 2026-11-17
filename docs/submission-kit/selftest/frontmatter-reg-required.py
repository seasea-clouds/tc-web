# -*- coding: utf-8 -*-
"""自检：R13 —— 法规题录必填字段齐备"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 删掉文号字段：法规页「文号」栏会空着
    H.patch_json(work, "docNumber", H.DELETE, kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R13", mutate, "法规题录删掉 docNumber")]))
