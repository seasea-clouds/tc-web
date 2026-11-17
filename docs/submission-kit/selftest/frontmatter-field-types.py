# -*- coding: utf-8 -*-
"""自检：M12 —— locales 类型错误（字符串）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    H.patch_json(work, "locales", "en,zh")


if __name__ == "__main__":
    raise SystemExit(H.main([("M12", mutate, "locales 改成字符串")]))
